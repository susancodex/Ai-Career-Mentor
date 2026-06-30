from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, CookieTokenRefreshView,
    ForgotPasswordView, ResetPasswordView, ChangePasswordView,
    ProfileView, AvatarUploadView, DeleteAccountView,
)

urlpatterns = [
    # Auth
    path("auth/register/",        RegisterView.as_view(),           name="auth-register"),
    path("auth/login/",           LoginView.as_view(),              name="auth-login"),
    path("auth/logout/",          LogoutView.as_view(),             name="auth-logout"),
    path("auth/refresh/",         CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/password/forgot/", ForgotPasswordView.as_view(),     name="password-forgot"),
    path("auth/password/reset/",  ResetPasswordView.as_view(),      name="password-reset"),
    path("auth/password/change/", ChangePasswordView.as_view(),     name="password-change"),
    # Profile
    path("me/",                   ProfileView.as_view(),            name="profile"),
    path("me/avatar/",            AvatarUploadView.as_view(),       name="avatar-upload"),
    path("me/delete/",            DeleteAccountView.as_view(),      name="account-delete"),
]
