"""
Django auth endpoint tests.

Uses pytest-django + Django test client. The AI service client
(core.ai_client) is mocked throughout — no real AI calls in CI.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def registered_user(db, client):
    response = client.post(
        "/api/v1/auth/register/",
        {"email": "test@example.com", "password": "securepass123", "full_name": "Test User"},
        format="json",
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.django_db
def test_register_creates_user_and_returns_tokens(client):
    response = client.post(
        "/api/v1/auth/register/",
        {"email": "newuser@example.com", "password": "securepass123", "full_name": "New User"},
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    assert "tokens" in data
    assert "access" in data["tokens"]
    assert "refresh" in data["tokens"]
    assert data["user"]["email"] == "newuser@example.com"


@pytest.mark.django_db
def test_register_duplicate_email_rejected(client, registered_user):
    response = client.post(
        "/api/v1/auth/register/",
        {"email": "test@example.com", "password": "anotherpass", "full_name": "Dupe"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_valid_credentials(client, registered_user):
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "test@example.com", "password": "securepass123"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "tokens" in data
    assert "access" in data["tokens"]


@pytest.mark.django_db
def test_login_wrong_password_rejected(client, registered_user):
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "test@example.com", "password": "wrongpassword"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_requires_auth(client):
    response = client.get("/api/v1/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_returns_profile_for_authenticated_user(client, registered_user):
    access_token = registered_user["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = client.get("/api/v1/me/")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "profile" in data


@pytest.mark.django_db
def test_me_patch_updates_profile(client, registered_user):
    access_token = registered_user["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = client.patch(
        "/api/v1/me/",
        {"current_role": "Software Engineer", "years_experience": 5},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["profile"]["current_role"] == "Software Engineer"
    assert data["profile"]["years_experience"] == 5


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(client, registered_user):
    refresh_token = registered_user["tokens"]["refresh"]
    access_token = registered_user["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = client.post("/api/v1/auth/logout/", {"refresh": refresh_token}, format="json")
    assert response.status_code == 204
