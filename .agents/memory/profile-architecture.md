---
name: Profile system architecture
description: How user profile, avatar, password, and auth pages are wired across Django + React.
---

## Backend

- `PATCH /api/v1/me/` uses `ProfileSerializer` (not `ProfileUpdateSerializer`) so that `first_name`/`last_name` fields (sourced from `user.*`) are properly saved via its custom `update()` method.
- `POST /api/v1/me/avatar/` — frontend uploads to Cloudinary first, sends `{cloudinary_url, cloudinary_public_id}` to this endpoint which validates the cloud name then saves to profile.
- `DELETE /api/v1/me/delete/` — requires password in request body for confirmation.
- `POST /api/v1/me/password/change/` — requires `current_password` + `new_password`.
- All four `me/*` routes are declared in **both** `apps/users/urls.py` (under `/api/v1/auth/me/`) AND `config/urls.py` (under `/api/v1/me/`). Frontend uses the canonical `/api/v1/me/` path. Django names are prefixed `me-*` in config/urls.py to avoid duplicate name conflicts.

**Why:** Frontend Vite dev proxy maps `/api` → Django 8000; all API calls use `/api/v1/me/` base. The duplicate route under `/api/v1/auth/me/` is a legacy artifact.

## Frontend

- `types/index.ts`: `User` has `profile?: Profile`; `Profile` has all extended fields (avatar_url, phone, linkedin_url, job_title, company, preferred_roles, skills, email_notifications_enabled, theme_preference, etc.).
- `ProfilePage.tsx`: tabbed UI — Personal Info | Security | Preferences. Avatar upload is gated on `VITE_CLOUDINARY_CLOUD_NAME` env var presence; gracefully disabled if absent.
- `ProtectedRoute` already wraps children in `DashboardLayout` — do NOT wrap again in App.tsx.
- Auth pages (ForgotPassword, ResetPassword) are public routes with design system styling matching Login/Register.
- `DashboardLayout` sidebar bottom section: clicking user avatar/name navigates to `/profile`; shows actual avatar if present.
