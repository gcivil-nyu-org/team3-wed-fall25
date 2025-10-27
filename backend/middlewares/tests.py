# Create your tests here.
from unittest import TestCase
from unittest.mock import Mock, patch
from django.http import JsonResponse
from django.test import RequestFactory
from rest_framework.exceptions import (
    ValidationError,
    NotAuthenticated,
    AuthenticationFailed,
)
from rest_framework.response import Response

from middlewares.error_middleware import ErrorMiddleware, custom_exception_handler
from middlewares.ok_middleware import OkJSONRenderer
from middlewares.pagenation import Pagination
from common.exceptions.bad_request_error import BadRequestError


class ErrorMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = ErrorMiddleware(
            lambda request: JsonResponse({"test": "data"})
        )

    def test_error_middleware_success(self):
        """Test ErrorMiddleware with successful request"""
        request = self.factory.get("/api/test/")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 200)

    def test_error_middleware_bad_request_error(self):
        """Test ErrorMiddleware with BadRequestError"""

        def get_response(request):
            raise BadRequestError("Test error", status=400)

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("result", response.content.decode())
        self.assertIn("Test error", response.content.decode())

    def test_error_middleware_validation_error(self):
        """Test ErrorMiddleware with ValidationError"""

        def get_response(request):
            raise ValidationError("Validation failed")

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("result", response.content.decode())
        self.assertIn("Validation failed", response.content.decode())

    def test_error_middleware_not_authenticated(self):
        """Test ErrorMiddleware with NotAuthenticated"""

        def get_response(request):
            raise NotAuthenticated()

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication required", response.content.decode())

    def test_error_middleware_authentication_failed(self):
        """Test ErrorMiddleware with AuthenticationFailed"""

        def get_response(request):
            raise AuthenticationFailed()

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication failed", response.content.decode())

    def test_error_middleware_permission_denied(self):
        """Test ErrorMiddleware with PermissionDenied"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

        def get_response(request):
            raise DRFPermissionDenied()

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 403)
        self.assertIn("Permission denied", response.content.decode())

    def test_error_middleware_http404(self):
        """Test ErrorMiddleware with Http404"""
        from django.http import Http404

        def get_response(request):
            raise Http404()

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 404)
        self.assertIn("Resource not found", response.content.decode())

    def test_error_middleware_generic_exception_api(self):
        """Test ErrorMiddleware with generic exception on API path"""

        def get_response(request):
            raise Exception("Generic error")

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/api/test/")
        response = middleware(request)

        self.assertEqual(response.status_code, 500)
        self.assertIn("Internal server error", response.content.decode())

    def test_error_middleware_generic_exception_non_api(self):
        """Test ErrorMiddleware with generic exception on non-API path"""

        def get_response(request):
            raise Exception("Generic error")

        middleware = ErrorMiddleware(get_response)
        request = self.factory.get("/non-api/test/")

        with self.assertRaises(Exception):
            middleware(request)


class CustomExceptionHandlerTests(TestCase):
    def test_custom_exception_handler_validation_error_dict(self):
        """Test custom_exception_handler with ValidationError dict"""
        exc = ValidationError({"field": ["Error message"]})
        context = {"view": Mock()}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.data["result"], False)
        self.assertEqual(response.data["error_message"], "Error message")

    def test_custom_exception_handler_validation_error_string(self):
        """Test custom_exception_handler with ValidationError string"""
        exc = ValidationError("Simple error")
        context = {"view": Mock()}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.data["result"], False)
        # ValidationError string gets wrapped in ErrorDetail
        self.assertIn("Simple error", str(response.data["error_message"]))

    def test_custom_exception_handler_other_exception(self):
        """Test custom_exception_handler with other exception"""
        exc = Exception("Other error")
        context = {"view": Mock()}

        response = custom_exception_handler(exc, context)

        self.assertIsNotNone(response)
        self.assertEqual(response.data["result"], False)
        self.assertIn("error_message", response.data)

    def test_custom_exception_handler_no_response(self):
        """Test custom_exception_handler when DRF returns None"""
        exc = Exception("Unknown error")
        context = {"view": Mock()}

        with patch(
            "middlewares.error_middleware.drf_exception_handler", return_value=None
        ):
            response = custom_exception_handler(exc, context)

            self.assertIsNotNone(response)
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.data["result"], False)
            self.assertEqual(response.data["error_message"], "Internal server error.")


class OkJSONRendererTests(TestCase):
    def setUp(self):
        self.renderer = OkJSONRenderer()
        self.renderer_context = {"response": Mock(status_code=200, exception=False)}

    def test_ok_json_renderer_exception_response(self):
        """Test OkJSONRenderer with exception response"""
        data = {"error": "Test error"}
        renderer_context = {"response": Mock(status_code=400, exception=True)}

        result = self.renderer.render(data, renderer_context=renderer_context)
        self.assertIn(b"error", result)

    def test_ok_json_renderer_with_result_key(self):
        """Test OkJSONRenderer with data containing result key"""
        data = {"result": False, "error": "Test error"}

        result = self.renderer.render(data, renderer_context=self.renderer_context)
        self.assertIn(b"result", result)
        self.assertIn(b"error", result)

    def test_ok_json_renderer_with_pagination(self):
        """Test OkJSONRenderer with pagination data"""
        data = {
            "count": 100,
            "results": [{"id": 1}, {"id": 2}],
            "next": "http://example.com/next",
            "previous": None,
        }

        result = self.renderer.render(data, renderer_context=self.renderer_context)
        self.assertIn(b"items", result)
        self.assertIn(b"pagination", result)
        self.assertIn(b"count", result)

    def test_ok_json_renderer_normal_data(self):
        """Test OkJSONRenderer with normal data"""
        data = {"message": "Success", "data": [1, 2, 3]}

        result = self.renderer.render(data, renderer_context=self.renderer_context)
        self.assertIn(b"result", result)
        self.assertIn(b"data", result)
        self.assertIn(b"Success", result)

    def test_ok_json_renderer_no_renderer_context(self):
        """Test OkJSONRenderer without renderer_context"""
        data = {"message": "Success"}

        result = self.renderer.render(data)
        self.assertIn(b"result", result)
        self.assertIn(b"data", result)


class PaginationTests(TestCase):
    def setUp(self):
        self.pagination = Pagination()

    def test_pagination_default_settings(self):
        """Test Pagination default settings"""
        self.assertEqual(self.pagination.page_size, 20)
        self.assertEqual(self.pagination.page_size_query_param, "page_size")
        self.assertEqual(self.pagination.max_page_size, 200)

    def test_pagination_get_paginated_response(self):
        """Test Pagination get_paginated_response method"""
        data = [{"id": 1}, {"id": 2}]

        # Mock the page object
        mock_page = Mock()
        mock_page.paginator.count = 100

        self.pagination.page = mock_page

        with patch.object(
            self.pagination, "get_next_link", return_value="http://example.com/next"
        ):
            with patch.object(self.pagination, "get_previous_link", return_value=None):
                response = self.pagination.get_paginated_response(data)

                self.assertIsInstance(response, Response)
                self.assertIn("items", response.data)
                self.assertIn("pagination", response.data)
                self.assertEqual(response.data["pagination"]["count"], 100)
                self.assertEqual(
                    response.data["pagination"]["next"], "http://example.com/next"
                )
                self.assertIsNone(response.data["pagination"]["previous"])

    def test_pagination_get_paginated_response_with_previous(self):
        """Test Pagination get_paginated_response with previous link"""
        data = [{"id": 1}, {"id": 2}]

        mock_page = Mock()
        mock_page.paginator.count = 50

        self.pagination.page = mock_page

        with patch.object(self.pagination, "get_next_link", return_value=None):
            with patch.object(
                self.pagination,
                "get_previous_link",
                return_value="http://example.com/prev",
            ):
                response = self.pagination.get_paginated_response(data)

                self.assertEqual(response.data["pagination"]["count"], 50)
                self.assertIsNone(response.data["pagination"]["next"])
                self.assertEqual(
                    response.data["pagination"]["previous"], "http://example.com/prev"
                )
