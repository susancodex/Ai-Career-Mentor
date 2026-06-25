from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.users.views import MeView


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
    # Profile (GET + PATCH /api/v1/me/)
    path("api/v1/me/", MeView.as_view(), name="me"),
    # Feature endpoints
    path("api/v1/", include("apps.resumes.urls")),
    path("api/v1/", include("apps.careers.urls")),
    path("api/v1/", include("apps.jobs.urls")),
    path("api/v1/", include("apps.interviews.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/", include("apps.chat.urls")),
]
