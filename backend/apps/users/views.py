from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, MeSerializer, ProfileSerializer,
    ProfileUpdateSerializer, AvatarUploadSerializer
)
from .models import PasswordResetToken

User = get_user_model()

_REFRESH_COOKIE_NAME = "refresh_token"
_REFRESH_COOKIE_PATH = "/api/v1/auth/refresh/"


def _set_refresh_cookie(response, refresh_token_str: str) -> None:
    """Attach an httpOnly refresh-token cookie to *response*."""
    refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    max_age = int(refresh_lifetime.total_seconds())
    secure = not settings.DEBUG
    same_site = "Lax" if settings.DEBUG else "None"
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=refresh_token_str,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite=same_site,
        path=_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response) -> None:
    """Expire the refresh-token cookie immediately."""
    response.delete_cookie(
        key=_REFRESH_COOKIE_NAME,
        path=_REFRESH_COOKIE_PATH,
        samesite="Lax" if settings.DEBUG else "None",
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )
        _set_refresh_cookie(response, str(refresh))
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "unauthorized", "message": "Invalid credentials.", "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"error": {"code": "unauthorized", "message": "Invalid credentials.", "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
            }
        )
        _set_refresh_cookie(response, str(refresh))
        return response


class CookieTokenRefreshView(APIView):
    """
    Reads the refresh token from the httpOnly cookie rather than the request body.
    Falls back to request body so curl / Swagger still work in development.
    If ROTATE_REFRESH_TOKENS is True (the default), the old token is blacklisted and
    a new cookie is set with the rotated refresh token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token_str = (
            request.COOKIES.get(_REFRESH_COOKIE_NAME)
            or request.data.get("refresh")
        )
        if not refresh_token_str:
            return Response(
                {"error": {"code": "unauthorized", "message": "No refresh token.", "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token_str})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken) as exc:
            return Response(
                {"error": {"code": "unauthorized", "message": str(exc.args[0]), "details": {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        response = Response({"access": data["access"]})
        if "refresh" in data:
            _set_refresh_cookie(response, data["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token_str = (
            request.COOKIES.get(_REFRESH_COOKIE_NAME)
            or request.data.get("refresh")
        )
        if refresh_token_str:
            try:
                token = RefreshToken(refresh_token_str)
                token.blacklist()
            except Exception:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class ForgotPasswordView(APIView):
    """
    Accepts an email address and sends a password reset email.
    Always returns 200 to prevent user enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        
        try:
            user = User.objects.get(email=email)
            # Create password reset token
            reset_token = PasswordResetToken.objects.create(user=user)
            
            # Build reset URL
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            reset_url = f"{frontend_url}/reset-password?token={reset_token.token}"
            
            # Send email
            subject = "Reset your password"
            message = f"""
            Hello {user.full_name or user.email},
            
            You requested a password reset. Click the link below to reset your password:
            
            {reset_url}
            
            This link will expire in 1 hour.
            
            If you didn't request this, you can safely ignore this email.
            """
            
            send_mail(
                subject,
                message,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@localhost"),
                [email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            # User doesn't exist - still return success to prevent enumeration
            pass
        
        return Response({"message": "If an account with this email exists, a password reset link has been sent."})


class ResetPasswordView(APIView):
    """
    Accepts a token and new password to reset the user's password.
    Token should be validated for expiry (1 hour) and single-use.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token", "")
        new_password = request.data.get("new_password", "")

        if not token_str or not new_password:
            return Response(
                {"error": "Token and new password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = PasswordResetToken.objects.select_related("user").get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not token.is_valid():
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        token.user.set_password(new_password)
        token.user.save()

        # Invalidate token
        token.used = True
        token.save(update_fields=["used"])

        return Response({"message": "Password reset successful."})


class ChangePasswordView(APIView):
    """
    Authenticated endpoint to change password.
    Requires current_password and new_password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        
        if not current_password or not new_password:
            return Response(
                {"error": "Current password and new password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not request.user.check_password(current_password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.user.set_password(new_password)
        request.user.save()
        
        return Response({"message": "Password changed successfully."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class AvatarUploadView(APIView):
    """
    Accepts a Cloudinary URL already uploaded by the frontend.
    Validates the URL belongs to our Cloudinary cloud before saving.
    If the user had a previous avatar, deletes it from Cloudinary.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        url = serializer.validated_data["cloudinary_url"]
        public_id = serializer.validated_data["cloudinary_public_id"]

        # Validate URL belongs to our cloud
        if f"res.cloudinary.com/{cloud_name}" not in url:
            return Response({"error": "Invalid Cloudinary URL."}, status=400)

        profile = request.user.profile

        # Delete previous avatar from Cloudinary if one exists
        if profile.avatar_public_id:
            try:
                import cloudinary.uploader
                cloudinary.uploader.destroy(profile.avatar_public_id)
            except Exception:
                pass  # Don't fail the upload if cleanup fails

        profile.avatar_url = url
        profile.avatar_public_id = public_id
        profile.save(update_fields=["avatar_url", "avatar_public_id", "updated_at"])
        return Response({"avatar_url": url})


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"error": "Incorrect password."}, status=400)

        # Clean up Cloudinary avatar if exists
        if hasattr(request.user, "profile") and request.user.profile.avatar_public_id:
            try:
                import cloudinary.uploader
                cloudinary.uploader.destroy(request.user.profile.avatar_public_id)
            except Exception:
                pass

        request.user.delete()
        response = Response(status=204)
        response.delete_cookie("refresh_token")
        return response
