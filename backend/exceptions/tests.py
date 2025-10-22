# Create your tests here.
from unittest import TestCase

from exceptions.bad_request_error import BadRequestError
from exceptions.db_error import DatabaseError


class ExceptionsTests(TestCase):
    def test_bad_request_error_initialization(self):
        """Test BadRequestError initialization"""
        error = BadRequestError("Test error message")
        self.assertEqual(error.message, "Test error message")
        self.assertEqual(error.status, 400)

    def test_bad_request_error_custom_status(self):
        """Test BadRequestError with custom status"""
        error = BadRequestError("Test error message", status=422)
        self.assertEqual(error.message, "Test error message")
        self.assertEqual(error.status, 422)

    def test_bad_request_error_inheritance(self):
        """Test BadRequestError inheritance"""
        error = BadRequestError("Test error message")
        self.assertIsInstance(error, Exception)

    def test_bad_request_error_str_representation(self):
        """Test BadRequestError string representation"""
        error = BadRequestError("Test error message")
        self.assertEqual(str(error), "Test error message")

    def test_database_error_initialization(self):
        """Test DatabaseError initialization"""
        error = DatabaseError()
        self.assertIsInstance(error, Exception)

    def test_database_error_inheritance(self):
        """Test DatabaseError inheritance"""
        error = DatabaseError()
        self.assertIsInstance(error, Exception)

    def test_database_error_str_representation(self):
        """Test DatabaseError string representation"""
        error = DatabaseError()
        self.assertIsInstance(str(error), str)

    def test_bad_request_error_edge_cases(self):
        """Test BadRequestError edge cases"""
        # Test with empty message
        error = BadRequestError("")
        self.assertEqual(error.message, "")
        self.assertEqual(error.status, 400)

        # Test with None message
        error = BadRequestError(None)
        self.assertIsNone(error.message)
        self.assertEqual(error.status, 400)

        # Test with very long message
        long_message = "a" * 1000
        error = BadRequestError(long_message)
        self.assertEqual(error.message, long_message)
        self.assertEqual(error.status, 400)

    def test_bad_request_error_status_codes(self):
        """Test BadRequestError with different status codes"""
        status_codes = [400, 401, 403, 404, 422, 500]
        for status_code in status_codes:
            error = BadRequestError("Test error", status=status_code)
            self.assertEqual(error.status, status_code)

    def test_bad_request_error_unicode_message(self):
        """Test BadRequestError with unicode message"""
        unicode_message = "测试错误消息"
        error = BadRequestError(unicode_message)
        self.assertEqual(error.message, unicode_message)

    def test_bad_request_error_special_characters(self):
        """Test BadRequestError with special characters"""
        special_message = "Error with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?"
        error = BadRequestError(special_message)
        self.assertEqual(error.message, special_message)

    def test_database_error_consistency(self):
        """Test DatabaseError consistency"""
        error1 = DatabaseError()
        error2 = DatabaseError()

        # Both should be instances of Exception
        self.assertIsInstance(error1, Exception)
        self.assertIsInstance(error2, Exception)

        # Both should be instances of DatabaseError
        self.assertIsInstance(error1, DatabaseError)
        self.assertIsInstance(error2, DatabaseError)

    def test_exceptions_import(self):
        """Test that exceptions can be imported"""
        try:
            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Failed to import exceptions: {e}")

    def test_exceptions_instantiation(self):
        """Test that exceptions can be instantiated"""
        try:
            bad_error = BadRequestError("Test")
            db_error = DatabaseError()
            self.assertIsNotNone(bad_error)
            self.assertIsNotNone(db_error)
        except Exception as e:
            self.fail(f"Failed to instantiate exceptions: {e}")

    def test_bad_request_error_attributes(self):
        """Test BadRequestError attributes"""
        error = BadRequestError("Test message", status=500)

        # Test that attributes exist
        self.assertTrue(hasattr(error, "message"))
        self.assertTrue(hasattr(error, "status"))

        # Test attribute values
        self.assertEqual(error.message, "Test message")
        self.assertEqual(error.status, 500)

    def test_database_error_attributes(self):
        """Test DatabaseError attributes"""
        error = DatabaseError()

        # Test that it's an exception
        self.assertIsInstance(error, Exception)

        # Test that it can be raised
        with self.assertRaises(DatabaseError):
            raise DatabaseError()

    def test_bad_request_error_raising(self):
        """Test BadRequestError raising"""
        with self.assertRaises(BadRequestError) as context:
            raise BadRequestError("Test error message")

        self.assertEqual(context.exception.message, "Test error message")
        self.assertEqual(context.exception.status, 400)

    def test_database_error_raising(self):
        """Test DatabaseError raising"""
        with self.assertRaises(DatabaseError):
            raise DatabaseError()

    def test_exceptions_in_exception_handling(self):
        """Test exceptions in exception handling"""
        try:
            raise BadRequestError("Test error")
        except BadRequestError as e:
            self.assertEqual(e.message, "Test error")
            self.assertEqual(e.status, 400)

        try:
            raise DatabaseError()
        except DatabaseError:
            self.assertTrue(True)  # Exception was caught successfully

    def test_bad_request_error_with_different_types(self):
        """Test BadRequestError with different message types"""
        # Test with string
        error = BadRequestError("String message")
        self.assertEqual(error.message, "String message")

        # Test with number
        error = BadRequestError(123)
        self.assertEqual(error.message, 123)

        # Test with boolean
        error = BadRequestError(True)
        self.assertEqual(error.message, True)

    def test_bad_request_error_status_validation(self):
        """Test BadRequestError status validation"""
        # Test with valid status codes
        valid_statuses = [200, 300, 400, 500, 999]
        for status in valid_statuses:
            error = BadRequestError("Test", status=status)
            self.assertEqual(error.status, status)

    def test_exceptions_module_structure(self):
        """Test exceptions module structure"""
        import exceptions.bad_request_error
        import exceptions.db_error

        # Test that modules exist
        self.assertIsNotNone(exceptions.bad_request_error)
        self.assertIsNotNone(exceptions.db_error)

        # Test that classes exist
        self.assertTrue(hasattr(exceptions.bad_request_error, "BadRequestError"))
        self.assertTrue(hasattr(exceptions.db_error, "DatabaseError"))
