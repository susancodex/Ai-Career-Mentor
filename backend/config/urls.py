from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.users.views import MeView, AvatarUploadView, DeleteAccountView, ChangePasswordView


def health(_request):
    """Liveness probe — used by Docker Compose and load balancer healthchecks."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Auth endpoints
    path("api/v1/auth/", include("apps.users.urls")),
    # Profile — reachable at /api/v1/me/* (canonical path used by the frontend)
    path("api/v1/me/", MeView.as_view(), name="me"),
    path("api/v1/me/avatar/", AvatarUploadView.as_view(), name="me-avatar-upload"),
    path("api/v1/me/delete/", DeleteAccountView.as_view(), name="me-account-delete"),
    path("api/v1/me/password/change/", ChangePasswordView.as_view(), name="me-password-change"),
    # Feature endpoints
    path("api/v1/", include("apps.resumes.urls")),
    path("api/v1/", include("apps.careers.urls")),
    path("api/v1/", include("apps.jobs.urls")),
    path("api/v1/", include("apps.interviews.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/", include("apps.chat.urls")),
]
