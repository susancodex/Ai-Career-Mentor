# Definition of Done

Integration is complete when every single item below is true.
Do not declare done until all are green.

- [ ] make up from a clean checkout brings all services healthy in < 3 minutes
  - Requires running docker compose up from clean state

- [ ] All 8 manual test flows in Section 6 pass end-to-end through the container stack
  - See MANUAL_TEST_CHECKLIST.md for full test suite
  - Requires running full Docker stack and manual testing

- [ ] Chat tokens render progressively (confirmed in DevTools → EventStream)
  - Verified: Nginx config has proxy_buffering off and X-Accel-Buffering no
  - Verified: Django SSE view uses StreamingHttpResponse with proper headers
  - Verified: FastAPI returns SSE with proper headers
  - Requires manual browser testing to confirm

- [ ] Profile section complete: view, edit, avatar, password change, forgot password,
    logout, theme preference, notification settings, delete account
  - Backend: All endpoints implemented in backend/apps/users/views.py
  - Frontend: AvatarUpload.tsx, ForgotPassword.tsx, ResetPassword.tsx created
  - useLogout.ts hook created
  - Requires integration testing

- [ ] All pages render correctly at 375px width with no horizontal scroll
  - BottomNav component created with mobile-first design
  - Requires manual mobile testing

- [ ] make test passes in < 5 minutes with zero real Gemini API calls
  - CI configuration exists with mocked AI calls
  - Requires running test suite

- [ ] All CI jobs pass on a fresh branch push
  - CI configuration exists at .github/workflows/ci.yml
  - Requires pushing to GitHub to verify

- [ ] All security checklist items are ticked
  - See SECURITY_CHECKLIST.md for verification status
  - Some items require running npm audit, pip-audit, and frontend build

- [ ] No AI scaffolding files in the repo
  - Verified: No replit.nix, .aider*, TODO_AI.md files found

- [ ] No TODO / stub / placeholder in integration code
  - Verified: Checked backend/apps/ and ai_service/app/ - only documentation STUB comments

- [ ] git log --oneline shows incremental commits — not a single "add everything" commit
  - Requires checking git history

---

## Summary of Work Completed

### Backend Changes
1. Added `PasswordResetToken` model with token validation and expiry
2. Implemented `ForgotPasswordView` with email sending
3. Implemented `ResetPasswordView` with token validation and invalidation
4. Added `FRONTEND_URL` and `PASSWORD_RESET_TIMEOUT_SECONDS` to settings
5. Added `error_message` field to `Resume` model for failure tracking
6. Added `error_message` field to `AsyncJob` model for user-friendly errors
7. Enhanced error handling in all async tasks (careers, jobs, learning, interviews) with user-friendly error messages

### Frontend Changes
1. Removed persist middleware from authStore for in-memory token storage
2. Created `AvatarUpload.tsx` component with Cloudinary integration
3. Created `ForgotPassword.tsx` page
4. Created `ResetPassword.tsx` page
5. Created `useLogout.ts` hook
6. Created `BottomNav.tsx` component for mobile navigation

### Infrastructure Changes
1. Fixed docker-compose.yml bug (duplicate build section in celery_worker, missing frontend service)
2. Updated .env.example files for backend, ai_service, frontend, and root
3. Created MANUAL_TEST_CHECKLIST.md with comprehensive test suite
4. Created SECURITY_CHECKLIST.md with verification status
5. Created DEFINITION_OF_DONE.md with completion criteria

### Migrations Created
1. backend/apps/users/migrations/0003_passwordresettoken.py
2. backend/apps/resumes/migrations/0003_resume_error_message.py
3. backend/apps/jobs/migrations/0003_asyncjob_error_message.py
