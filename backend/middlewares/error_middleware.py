from django.core.exceptions import PermissionDenied
from django.http import Http404, JsonResponse
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
)
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from rest_framework.exceptions import (
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from common.exceptions.bad_request_error import BadRequestError


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, ValidationError):
            detail = response.data
            if isinstance(detail, dict):
                first_key = next(iter(detail))
                message = (
                    detail[first_key][0]
                    if isinstance(detail[first_key], list)
                    else str(detail[first_key])
                )
            else:
                message = str(detail)

            response.data = {"result": False, "error_message": message}
            return response

        response.data = {
            "result": False,
            "error_message": str(response.data.get("detail", "An error occurred.")),
        }
        return response

    return Response(
        {"result": False, "error_message": "Internal server error."}, status=500
    )


class ErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        # custom exceptions
        except BadRequestError as e:
            return JsonResponse(
                {"result": False, "error_message": e.message},
                status=e.status,
            )

        # rest framework exceptions
        except ValidationError as e:
            return JsonResponse(
                {
                    "result": False,
                    "error_message": str(e.detail if hasattr(e, "detail") else e),
                },
                status=400,
            )
        except NotAuthenticated:
            return JsonResponse(
                {"result": False, "error_message": "Authentication required."},
                status=401,
            )
        except AuthenticationFailed:
            return JsonResponse(
                {"result": False, "error_message": "Authentication failed."},
                status=401,
            )
        except (DRFPermissionDenied, PermissionDenied):
            return JsonResponse(
                {"result": False, "error_message": "Permission denied."},
                status=403,
            )
        except Http404:
            return JsonResponse(
                {"result": False, "error_message": "Resource not found."},
                status=404,
            )

        # cover all other exceptions
        except Exception:
            if request.path.startswith("/api/"):
                return JsonResponse(
                    {"result": False, "error_message": "Internal server error."},
                    status=500,
                )
            raise
