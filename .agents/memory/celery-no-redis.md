---
name: Celery-without-Redis dev pattern
description: How to make Celery task dispatch safe when Redis is absent (Replit bare dev), and the DRF + SSE renderer fix.
---

## Celery broker fast-fail (core/tasks.py)

Calling `.delay()` or `.apply_async()` without Redis triggers kombu's internal Redis retry loop: 20 retries × 1 s = ~20 s hang BEFORE Python raises an exception. Transport-option settings (`max_retries`, `socket_timeout`) do NOT reliably shorten this loop — the Redis backend has its own hardcoded retry policy.

**Fix:** Do a sub-second TCP probe (`socket.create_connection(host, port, timeout=0.5)`) before touching Celery. If the port is closed, log + return False immediately. If open, call `.delay()` / `.apply_async()` normally.

Implemented in `backend/core/tasks.py`:
- `_broker_reachable()` — probes CELERY_BROKER_URL host:port
- `safe_delay(task, *args)` — probe then `.delay()`
- `safe_apply_async(task, *, args, task_id, **opts)` — probe then `.apply_async()`

All five async-dispatch views (resumes, careers, jobs, interviews, learning) use these wrappers. `AsyncJobStatusView` also calls `_broker_reachable()` before `AsyncResult()` to avoid a Redis 500.

**Why:** Replit bare dev has no Redis. The 20-retry hang made every POST to an async endpoint time out (>15 s) and return an empty body.

**How to apply:** Any new view that calls `.delay()` or `.apply_async()` must use `safe_delay` / `safe_apply_async` from `core.tasks`. Never call `.delay()` directly in a view.

---

## DRF content negotiation + SSE

When a view returns `StreamingHttpResponse` with `content_type="text/event-stream"`, DRF's content negotiation still runs BEFORE the view method executes. If the client sends `Accept: text/event-stream` and the view only declares `JSONRenderer`, DRF returns 406 before the view even runs.

**Fix:** Add a passthrough renderer to the view:

```python
class EventStreamRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "event-stream"
    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data
```

Then on the view: `renderer_classes = [JSONRenderer, EventStreamRenderer]`

The renderer is never actually called for SSE (the view returns `StreamingHttpResponse` directly), but its presence satisfies DRF content negotiation.

Implemented in `backend/apps/chat/views.py`.

---

## Chat assistant fallback persistence

When the AI service is unreachable, `_stream_from_ai` catches `httpx.HTTPError` and yields an error token. The `finally` block persists `assistant_chunks` to DB. If the error token is not appended to `assistant_chunks` inside the `except` block, the assistant turn is never saved.

**Fix:** `assistant_chunks.append(msg)` before yielding in the `except httpx.HTTPError` branch.

---

## ChatMessageSerializer redundant source

`session_id = serializers.UUIDField(source="session_id")` raises `AssertionError` at runtime because `source` equals the field name. Remove the `source` kwarg: `session_id = serializers.UUIDField()`.
