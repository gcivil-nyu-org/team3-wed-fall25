# Create your tests here.
from unittest import TestCase
from unittest.mock import patch
import os

from utils.env_util import get_env


class UtilsEnvUtilTests(TestCase):
    def test_get_env_function_exists(self):
        """Test that get_env function exists"""
        self.assertTrue(callable(get_env))

    def test_get_env_returns_env_object(self):
        """Test that get_env returns an Env object"""
        env = get_env()
        self.assertIsNotNone(env)
        # Check that it has the expected methods
        self.assertTrue(hasattr(env, "str"))
        self.assertTrue(hasattr(env, "int"))
        self.assertTrue(hasattr(env, "bool"))
        self.assertTrue(hasattr(env, "float"))

    def test_get_env_with_str_method(self):
        """Test get_env with str method"""
        env = get_env()
        result = env.str("NONEXISTENT_VAR", default="default_value")
        self.assertEqual(result, "default_value")

    def test_get_env_with_int_method(self):
        """Test get_env with int method"""
        env = get_env()
        result = env.int("NONEXISTENT_VAR", default=42)
        self.assertEqual(result, 42)

    def test_get_env_with_bool_method(self):
        """Test get_env with bool method"""
        env = get_env()
        result = env.bool("NONEXISTENT_VAR", default=True)
        self.assertEqual(result, True)

    def test_get_env_with_float_method(self):
        """Test get_env with float method"""
        env = get_env()
        result = env.float("NONEXISTENT_VAR", default=3.14)
        self.assertEqual(result, 3.14)

    def test_get_env_with_existing_var(self):
        """Test get_env with existing environment variable"""
        with patch.dict(os.environ, {"TEST_VAR": "test_value"}):
            env = get_env()
            result = env.str("TEST_VAR", default="default_value")
            self.assertEqual(result, "test_value")

    def test_get_env_type_conversion(self):
        """Test get_env with type conversion"""
        with patch.dict(os.environ, {"TEST_INT": "123"}):
            env = get_env()
            result = env.int("TEST_INT", default=0)
            self.assertEqual(result, 123)

    def test_get_env_empty_string(self):
        """Test get_env with empty string"""
        with patch.dict(os.environ, {"EMPTY_VAR": ""}):
            env = get_env()
            result = env.str("EMPTY_VAR", default="default")
            self.assertEqual(result, "")

    def test_get_env_multiple_calls(self):
        """Test get_env with multiple calls"""
        with patch.dict(os.environ, {"VAR1": "value1", "VAR2": "value2"}):
            env = get_env()
            result1 = env.str("VAR1", default="default1")
            result2 = env.str("VAR2", default="default2")
            self.assertEqual(result1, "value1")
            self.assertEqual(result2, "value2")

    def test_get_env_case_sensitivity(self):
        """Test get_env case sensitivity"""
        with patch.dict(os.environ, {"test_var": "lowercase"}):
            env = get_env()
            result_lower = env.str("test_var", default="default")
            result_upper = env.str("TEST_VAR", default="default")
            self.assertEqual(result_lower, "lowercase")
            self.assertEqual(result_upper, "default")

    def test_get_env_special_characters(self):
        """Test get_env with special characters"""
        with patch.dict(
            os.environ, {"SPECIAL_VAR": "value with spaces & symbols!@#$%"}
        ):
            env = get_env()
            result = env.str("SPECIAL_VAR", default="default")
            self.assertEqual(result, "value with spaces & symbols!@#$%")

    def test_get_env_numeric_values(self):
        """Test get_env with numeric values"""
        with patch.dict(os.environ, {"NUM_VAR": "42"}):
            env = get_env()
            result = env.int("NUM_VAR", default=0)
            self.assertEqual(result, 42)

    def test_get_env_boolean_values(self):
        """Test get_env with boolean values"""
        with patch.dict(os.environ, {"BOOL_VAR": "true"}):
            env = get_env()
            result = env.bool("BOOL_VAR", default=False)
            self.assertEqual(result, True)

    def test_get_env_unicode_values(self):
        """Test get_env with unicode values"""
        with patch.dict(os.environ, {"UNICODE_VAR": "测试"}):
            env = get_env()
            result = env.str("UNICODE_VAR", default="default")
            self.assertEqual(result, "测试")

    def test_get_env_long_values(self):
        """Test get_env with long values"""
        long_value = "a" * 1000
        with patch.dict(os.environ, {"LONG_VAR": long_value}):
            env = get_env()
            result = env.str("LONG_VAR", default="short")
            self.assertEqual(result, long_value)

    def test_get_env_function_signature(self):
        """Test get_env function signature"""
        import inspect

        sig = inspect.signature(get_env)
        params = list(sig.parameters.keys())
        # get_env takes no parameters
        self.assertEqual(len(params), 0)

    def test_get_env_return_type(self):
        """Test get_env return type"""
        env = get_env()
        self.assertIsNotNone(env)
        # Check that it's an Env object
        self.assertTrue(hasattr(env, "str"))

    def test_get_env_with_os_environ_modification(self):
        """Test get_env with os.environ modification"""
        # Test that get_env reads from os.environ
        original_value = os.environ.get("TEST_MODIFICATION_VAR")

        try:
            os.environ["TEST_MODIFICATION_VAR"] = "modified_value"
            env = get_env()
            result = env.str("TEST_MODIFICATION_VAR", default="default")
            self.assertEqual(result, "modified_value")
        finally:
            if original_value is not None:
                os.environ["TEST_MODIFICATION_VAR"] = original_value
            else:
                os.environ.pop("TEST_MODIFICATION_VAR", None)

    def test_get_env_edge_cases(self):
        """Test get_env edge cases"""
        env = get_env()

        # Test with empty string key
        result = env.str("", default="default")
        self.assertEqual(result, "default")

        # Test with whitespace key
        result = env.str("   ", default="default")
        self.assertEqual(result, "default")

    def test_get_env_performance(self):
        """Test get_env performance with multiple calls"""
        import time

        env = get_env()
        start_time = time.time()
        for _ in range(1000):
            env.str("NONEXISTENT_VAR", default="default")
        end_time = time.time()

        # Should complete quickly (less than 1 second for 1000 calls)
        self.assertLess(end_time - start_time, 1.0)

    def test_get_env_consistency(self):
        """Test get_env consistency"""
        env = get_env()

        # Multiple calls with same parameters should return same result
        result1 = env.str("NONEXISTENT_VAR", default="consistent")
        result2 = env.str("NONEXISTENT_VAR", default="consistent")
        self.assertEqual(result1, result2)

        # Different defaults should return different results
        result3 = env.str("NONEXISTENT_VAR", default="different")
        self.assertNotEqual(result1, result3)

    def test_get_env_methods_exist(self):
        """Test that all expected methods exist on the Env object"""
        env = get_env()

        expected_methods = ["str", "int", "bool", "float", "list", "tuple", "dict"]
        for method in expected_methods:
            self.assertTrue(hasattr(env, method), f"Method {method} should exist")
            self.assertTrue(
                callable(getattr(env, method)), f"Method {method} should be callable"
            )

    def test_get_env_list_method(self):
        """Test get_env with list method"""
        env = get_env()
        result = env.list("NONEXISTENT_VAR", default=["item1", "item2"])
        self.assertEqual(result, ["item1", "item2"])

    def test_get_env_tuple_method(self):
        """Test get_env with tuple method"""
        env = get_env()
        result = env.tuple("NONEXISTENT_VAR", default=("item1", "item2"))
        self.assertEqual(result, ("item1", "item2"))

    def test_get_env_dict_method(self):
        """Test get_env with dict method"""
        env = get_env()
        result = env.dict("NONEXISTENT_VAR", default={"key": "value"})
        self.assertEqual(result, {"key": "value"})


2
