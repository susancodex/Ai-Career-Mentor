# End-to-End Manual Test Checklist

Run all 8 flows against the full Docker stack (not Vite dev server).
Tick each box only after watching it succeed with your own eyes.

## 6.1 Auth & Profile

- [ ] Register new account → access token in body, refresh cookie set in DevTools
- [ ] Login → same
- [ ] View profile → GET /me/ returns all fields
- [ ] Edit name, bio, location → PATCH /me/ → changes visible immediately in UI
- [ ] Upload avatar → image appears in navbar and profile page
- [ ] Change password → old password rejected, new password accepted
- [ ] Forgot password → email arrives (check spam), reset link works, redirects to login
- [ ] Logout → refresh token cookie cleared, /me/ returns 401, redirect to /login
- [ ] Login again → works with new session
- [ ] Delete account (with password confirm) → 204, redirect to /login, cannot log in again

## 6.2 Resume

- [ ] Upload .pdf ≤ 5 MB → 201, status transitions uploaded → processing → parsed
- [ ] Upload .docx ≤ 5 MB → same
- [ ] Upload .exe → rejected with clear error message (frontend + backend)
- [ ] Upload 6 MB PDF → rejected with clear error message (frontend + backend)
- [ ] View resume analysis → skills, experience, suggestions rendered
- [ ] Delete resume → removed from list, Cloudinary object deleted

## 6.3 Chat

- [ ] Create new chat session → 201 with session ID
- [ ] Send message → tokens stream progressively (watch in DevTools → Network → EventStream)
- [ ] Tokens render word-by-word in the UI — not in one block at the end
- [ ] Chat history persists after page reload
- [ ] Long message (4001 chars) → rejected with error toast before sending
- [ ] Send second message → context from first message is included

## 6.4 Async AI Features

- [ ] Generate career paths  → polling shows progress → results render
- [ ] Generate job matches   → same
- [ ] Generate learning roadmap → same
- [ ] Generate interview questions for a role → same
- [ ] Gemini rate limit hit  → shows "AI service is busy" message, not a crash

## 6.5 Mobile (Resize browser to 375px width)

- [ ] Bottom nav visible with 5 tabs, all ≥ 44px touch targets
- [ ] No horizontal scroll on any page
- [ ] Chat input stays above keyboard (use iOS Safari / Android Chrome)
- [ ] Avatar upload works on mobile (camera roll accessible)
- [ ] Profile form fields usable on mobile keyboard
- [ ] All modals / drawers close on backdrop click and Escape

---

## Verification Commands

### Auth & Profile
```bash
# Register
curl -s -c cookies.txt -X POST http://localhost/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","first_name":"Test","last_name":"User"}'

# Login
curl -s -c cookies.txt -X POST http://localhost/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Get profile
TOKEN="<paste access token>"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/me/

# Update profile
curl -s -X PATCH http://localhost/api/v1/me/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jane","bio":"Senior engineer"}'

# Forgot password
curl -s -X POST http://localhost/api/v1/auth/password/forgot/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Logout
curl -s -b cookies.txt -X POST http://localhost/api/v1/auth/logout/
```

### Resume
```bash
# Upload resume
curl -s -X POST http://localhost/api/v1/resumes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cloudinary_url":"https://res.cloudinary.com/YOURCLOUD/raw/upload/v1/test.pdf",
       "cloudinary_public_id":"test",
       "original_filename":"my_resume.pdf"}'

# Poll status
for i in {1..20}; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/resumes/1/ \
           | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "[$i] Status: $STATUS"
  [ "$STATUS" != "uploaded" ] && [ "$STATUS" != "processing" ] && break
  sleep 3
done
```

### Chat
```bash
# Create session
SESSION=$(curl -s -X POST http://localhost/api/v1/chat/sessions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test session"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Send message (watch for streaming)
curl -s -N -X POST http://localhost/api/v1/chat/sessions/$SESSION/messages/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"What are the top skills for a backend engineer?"}'
```

### Async AI Features
```bash
# Generate career paths
curl -s -X POST http://localhost/api/v1/career-paths/generate/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resume_id":1,"target_role":"Staff Engineer"}'

# Poll status
JOB_ID="<from above>"
curl -s http://localhost/api/v1/jobs/async-status/$JOB_ID/ \
  -H "Authorization: Bearer $TOKEN"
```
