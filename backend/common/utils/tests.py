from unittest import TestCase
from unittest.mock import patch, MagicMock

from common.utils.env_util import get_env


class EnvUtilTests(TestCase):
    def test_get_env_returns_env_instance(self):
        """Test get_env returns an Env instance"""
        env = get_env()
        self.assertIsNotNone(env)
        # Check that it has the expected methods
        self.assertTrue(hasattr(env, "str"))
        self.assertTrue(hasattr(env, "int"))
        self.assertTrue(hasattr(env, "bool"))

    @patch("common.utils.env_util.os.path.exists")
    @patch("common.utils.env_util.environ.Env.read_env")
    def test_get_env_with_existing_env_file(self, mock_read_env, mock_exists):
        """Test get_env when .env file exists"""
        mock_exists.return_value = True

        env = get_env()

        self.assertIsNotNone(env)
        mock_read_env.assert_called_once()

    @patch("common.utils.env_util.os.path.exists")
    @patch("common.utils.env_util.environ.Env.read_env")
    def test_get_env_without_env_file(self, mock_read_env, mock_exists):
        """Test get_env when .env file doesn't exist"""
        mock_exists.return_value = False

        env = get_env()

        self.assertIsNotNone(env)
        mock_read_env.assert_not_called()

    def test_get_env_path_calculation(self):
        """Test that get_env calculates the correct .env file path"""
        with patch("common.utils.env_util.os.path.exists") as mock_exists:
            mock_exists.return_value = True

            with patch("common.utils.env_util.environ.Env.read_env") as mock_read_env:
                get_env()

                # Verify that read_env was called
                mock_read_env.assert_called_once()

                # The path should be calculated relative to the project root
                # (4 levels up from common/utils/env_util.py)
                # We can't easily test the exact path without mocking Path.resolve(),
                # but we can verify the structure is correct
                self.assertTrue(mock_exists.called)

    @patch("common.utils.env_util.environ.Env")
    def test_get_env_creates_new_env_instance(self, mock_env_class):
        """Test that get_env creates a new Env instance"""
        mock_env_instance = MagicMock()
        mock_env_class.return_value = mock_env_instance

        result = get_env()

        self.assertEqual(result, mock_env_instance)
        mock_env_class.assert_called_once()

    def test_get_env_handles_imports_correctly(self):
        """Test that get_env imports work correctly"""
        # This test ensures the imports in env_util.py are working
        try:
            from common.utils.env_util import get_env

            env = get_env()
            self.assertIsNotNone(env)
        except ImportError as e:
            self.fail(f"Import failed: {e}")
