from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer, MeSerializer, ProfileUpdateSerializer

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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)
