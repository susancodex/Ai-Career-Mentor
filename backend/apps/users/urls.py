from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, CookieTokenRefreshView,
    ForgotPasswordView, ResetPasswordView, ChangePasswordView,
    MeView, AvatarUploadView, DeleteAccountView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("password/forgot/", ForgotPasswordView.as_view(), name="password-forgot"),
    path("password/reset/", ResetPasswordView.as_view(), name="password-reset"),
    path("password/change/", ChangePasswordView.as_view(), name="password-change"),
    path("me/", MeView.as_view(), name="profile"),
    path("me/avatar/", AvatarUploadView.as_view(), name="avatar-upload"),
    path("me/delete/", DeleteAccountView.as_view(), name="account-delete"),
]
