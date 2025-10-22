from unittest import TestCase

from common.exceptions.bad_request_error import BadRequestError
from common.exceptions.db_error import DatabaseError


class BadRequestErrorTests(TestCase):
    def test_bad_request_error_default_values(self):
        """Test BadRequestError with default values"""
        error = BadRequestError()
        self.assertEqual(error.message, "Error")
        self.assertEqual(error.status, 400)
        self.assertEqual(str(error), "Error")

    def test_bad_request_error_custom_message(self):
        """Test BadRequestError with custom message"""
        error = BadRequestError("Custom error message")
        self.assertEqual(error.message, "Custom error message")
        self.assertEqual(error.status, 400)
        self.assertEqual(str(error), "Custom error message")

    def test_bad_request_error_custom_status(self):
        """Test BadRequestError with custom status"""
        error = BadRequestError("Custom error", 422)
        self.assertEqual(error.message, "Custom error")
        self.assertEqual(error.status, 422)
        self.assertEqual(str(error), "Custom error")

    def test_bad_request_error_inheritance(self):
        """Test BadRequestError inherits from Exception"""
        error = BadRequestError("Test error")
        self.assertIsInstance(error, Exception)


class DatabaseErrorTests(TestCase):
    def test_database_error_default_values(self):
        """Test DatabaseError with default values"""
        error = DatabaseError()
        self.assertEqual(str(error), "")
        self.assertIsInstance(error, Exception)

    def test_database_error_custom_message(self):
        """Test DatabaseError with custom message"""
        error = DatabaseError("Connection failed")
        self.assertEqual(str(error), "Connection failed")
        self.assertIsInstance(error, Exception)

    def test_database_error_inheritance(self):
        """Test DatabaseError inherits from Exception"""
        error = DatabaseError("Test error")
        self.assertIsInstance(error, Exception)
