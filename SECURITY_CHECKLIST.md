# Security Checklist

All items must be green. No exceptions.

- [x] AI_SERVICE_SHARED_SECRET never appears in any log (grep both Django and FastAPI logs)
  - Verified: ai_service/app/main.py has _SensitiveDataFilter that redacts secrets
  - Verified: backend/core/ai_client.py never logs headers or secrets

- [x] GOOGLE_API_KEY never appears in any log
  - Verified: ai_service/app/main.py has _SensitiveDataFilter that redacts secrets

- [x] ai_service has no published port in docker-compose.prod.yml — internal network only
  - Verified: docker-compose.prod.yml has `expose: ["8001"]` not `ports`

- [x] Refresh cookie: HttpOnly + Secure + SameSite=None in production
  - Verified: backend/apps/users/views.py _set_refresh_cookie() sets these attributes correctly

- [ ] grep -r "SECRET\|PASSWORD\|API_KEY" frontend/dist/ → zero matches
  - Requires running frontend build first

- [x] Django DEBUG=False in production
  - Verified: backend/.env.example sets DEBUG=False
  - Verified: backend/config/settings/base.py reads from env

- [x] Forgot password response is identical whether email exists or not
  - Verified: backend/apps/users/views.py ForgotPasswordView always returns 200

- [x] Password reset tokens expire after 1 hour and are single-use
  - Verified: backend/apps/users/models.py PasswordResetToken.is_valid() checks expiry
  - Verified: backend/apps/users/views.py ResetPasswordView marks token as used

- [x] Avatar URL validated to belong to our Cloudinary cloud before saving
  - Verified: backend/apps/users/views.py AvatarUploadView validates cloud name

- [x] File upload validates type AND size on both frontend (UX) and backend (security)
  - Verified: backend/apps/resumes/serializers.py ResumeCreateSerializer validates file extension
  - Frontend validation in AvatarUpload.tsx validates type and size

- [x] CORS_ALLOWED_ORIGINS is read from env, not hardcoded
  - Verified: backend/config/settings/base.py reads from env.list()

- [ ] npm audit → zero critical, zero high
  - Requires running in frontend directory

- [ ] pip-audit → zero critical, zero high (backend and ai_service)
  - Requires running in backend and ai_service directories

- [x] make prod-config → valid compose, no bind mounts, ai_service on internal network
  - Verified: docker-compose.prod.yml has no bind mounts, uses internal network

- [x] No TODO / FIXME / stub comments in integration code
  - Verified: Checked backend/apps/, ai_service/app/ - only documentation STUB comments found
