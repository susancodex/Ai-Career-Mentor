import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": {
                "code": _get_error_code(response.status_code),
                "message": _flatten_errors(response.data),
                "details": response.data if isinstance(response.data, dict) else {},
            }
        }
        response.data = error_payload
    else:
        logger.exception("Unhandled exception", exc_info=exc)
        response = Response(
            {
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected error occurred.",
                    "details": {},
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_code(status_code: int) -> str:
    codes = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "unprocessable_entity",
        429: "rate_limited",
        500: "internal_server_error",
    }
    return codes.get(status_code, "error")


def _flatten_errors(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return " ".join(str(i) for i in data)
    if isinstance(data, dict):
        msgs = []
        for v in data.values():
            msgs.append(_flatten_errors(v))
        return " ".join(msgs)
    return str(data)
