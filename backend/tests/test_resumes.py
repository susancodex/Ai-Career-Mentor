"""
Django resume endpoint tests.

The Celery task (analyze_resume) is mocked — no real AI calls in CI.
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient


@pytest.fixture
def auth_client(db):
    client = APIClient()
    resp = client.post(
        "/api/v1/auth/register/",
        {"email": "resume_user@example.com", "password": "securepass123", "full_name": "Resume User"},
        format="json",
    )
    assert resp.status_code == 201
    access = resp.json()["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


@pytest.mark.django_db
def test_create_resume_enqueues_task(auth_client):
    """POST /resumes/ returns 201 and enqueues analyze_resume without blocking."""
    with patch("apps.resumes.views.analyze_resume.delay") as mock_task:
        response = auth_client.post(
            "/api/v1/resumes/",
            {
                "cloudinary_url": "https://res.cloudinary.com/demo/raw/upload/sample.pdf",
                "cloudinary_public_id": "sample",
                "original_filename": "my_resume.pdf",
            },
            format="json",
        )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "uploaded"
    mock_task.assert_called_once()  # Proves task was enqueued


@pytest.mark.django_db
def test_list_resumes_returns_only_own(auth_client):
    with patch("apps.resumes.views.analyze_resume.delay"):
        auth_client.post(
            "/api/v1/resumes/",
            {"cloudinary_url": "https://example.com/r.pdf", "cloudinary_public_id": "r1", "original_filename": "r.pdf"},
            format="json",
        )
    resp = auth_client.get("/api/v1/resumes/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.django_db
def test_resume_analysis_404_when_not_parsed(auth_client):
    with patch("apps.resumes.views.analyze_resume.delay"):
        create_resp = auth_client.post(
            "/api/v1/resumes/",
            {"cloudinary_url": "https://example.com/r.pdf", "cloudinary_public_id": "r2", "original_filename": "r.pdf"},
            format="json",
        )
    resume_id = create_resp.json()["id"]
    resp = auth_client.get(f"/api/v1/resumes/{resume_id}/analysis/")
    assert resp.status_code == 404
