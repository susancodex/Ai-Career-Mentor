---
name: Anti-vibe-coding discipline
description: Mandatory procedure for every code edit in this project — change-log format, forbidden patterns, exception rules, contract verification.
---

# Anti-Vibe-Coding Discipline

## The Change-Log Requirement
Every fix must produce a log entry with this exact structure before it is considered done:

```
FILE:      <exact path>
FUNCTION:  <exact function/component name>
BEFORE:    <quoted line(s) from the actual file — not a paraphrase>
WHY FAKE:  <which anti-pattern from the list below applies, and why>
FIX:       <the specific change made>
VERIFIED:  <exact command run + exact relevant output, or exact UI steps + what was observed>
```

Cannot fill in BEFORE with a quoted line → have not read the file closely enough yet. Stop and read it.
Cannot fill in VERIFIED with real output → the fix is not done, regardless of how the code looks.

## Forbidden Patterns
1. **Pattern-matching instead of understanding** — no `except: pass` copied from nearby code without understanding the actual exception.
2. **Plausible-sounding field names** — always grep the actual model/migration before using a field name in frontend types or serializers.
3. **Copy-adjust-pray** — when adapting code from Feature A to Feature B, explicitly verify data shape, auth requirements, and edge cases match.
4. **Test-shaped fixes** — don't tune code to pass one specific curl/test without checking correctness for other inputs.
5. **Confidence-inflating comments** — never write `# handles all edge cases` or `# fully tested` unless verification was actually run.
6. **Silent scope creep** — fix only what's in scope; do not clean up unrelated nearby code mid-edit.
7. **Trusting AI first output** — first JSON that parses without error is not automatically correct; verify actual field values make sense.

## Exception Handling Rule
No bare `except: pass` or `except Exception: return None` to hide errors.
Every exception handler must surface the failure as a real failure state (set job status to "failed", log the error, return a meaningful message).
The only acceptable bare excepts are those already in the codebase with an explicit comment justifying why swallowing is correct (e.g. best-effort Cloudinary cleanup).

## Data Contract Rule
Before editing any frontend↔backend boundary, read **both** sides in the same sitting:
- Grep the exact request shape the frontend sends
- Grep the exact request shape the backend expects
- Confirm they agree field-for-field
- Ground truth is the actual model/migration, not either side's assumption

## Self-Check Before Marking Done
Answer all four honestly — if any is "not really" or "I assumed," go back:
1. Did I read the full function I edited, not just the lines around my change?
2. Did I run the actual verification command and read the actual output?
3. If this touches a frontend/backend boundary, did I confirm both sides agree by reading both files?
4. Is every line I changed justified by a specific audit finding — or did I change it just because I was already in the file?

**Why:** User explicitly provided this as the required working discipline for this codebase to prevent AI-generated code that compiles and demos fine but is not actually correct.

**How to apply:** Before every single edit in this project — not just "complex" ones.
