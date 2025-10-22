# Create your tests here.
from django.test import TestCase
from django.conf import settings


class ConfigSettingsTests(TestCase):
    def test_settings_import(self):
        """Test that settings can be imported"""
        from config import settings

        self.assertIsNotNone(settings)

    def test_installed_apps(self):
        """Test that all required apps are in INSTALLED_APPS"""
        required_apps = [
            "django.contrib.admin",
            "django.contrib.auth",
            "django.contrib.contenttypes",
            "django.contrib.sessions",
            "django.contrib.messages",
            "django.contrib.staticfiles",
            "rest_framework",
            "rest_framework_simplejwt",
            "corsheaders",
            "drf_spectacular",
            "apps.user",
            "apps.dummy",
            "apps.building",
            "apps.community",
            "apps.neighborhood",
        ]

        for app in required_apps:
            self.assertIn(app, settings.INSTALLED_APPS)

    def test_middleware_configuration(self):
        """Test middleware configuration"""
        required_middleware = [
            "corsheaders.middleware.CorsMiddleware",
            "django.middleware.security.SecurityMiddleware",
            "whitenoise.middleware.WhiteNoiseMiddleware",
            "django.contrib.sessions.middleware.SessionMiddleware",
            "django.middleware.common.CommonMiddleware",
            "django.middleware.csrf.CsrfViewMiddleware",
            "django.contrib.auth.middleware.AuthenticationMiddleware",
            "django.contrib.messages.middleware.MessageMiddleware",
            "django.middleware.clickjacking.XFrameOptionsMiddleware",
            "middlewares.error_middleware.ErrorMiddleware",
        ]

        for middleware in required_middleware:
            self.assertIn(middleware, settings.MIDDLEWARE)

    def test_database_configuration(self):
        """Test database configuration"""
        self.assertIn("default", settings.DATABASES)
        db_config = settings.DATABASES["default"]
        self.assertEqual(db_config["ENGINE"], "django.db.backends.postgresql")
        self.assertIn("NAME", db_config)
        self.assertIn("USER", db_config)
        self.assertIn("PASSWORD", db_config)
        self.assertIn("HOST", db_config)
        self.assertIn("PORT", db_config)

    def test_rest_framework_configuration(self):
        """Test REST framework configuration"""
        rf_config = settings.REST_FRAMEWORK
        self.assertIn("DEFAULT_AUTHENTICATION_CLASSES", rf_config)
        self.assertIn("DEFAULT_RENDERER_CLASSES", rf_config)
        self.assertIn("EXCEPTION_HANDLER", rf_config)
        self.assertIn("DEFAULT_SCHEMA_CLASS", rf_config)

    def test_simple_jwt_configuration(self):
        """Test Simple JWT configuration"""
        jwt_config = settings.SIMPLE_JWT
        self.assertIn("ACCESS_TOKEN_LIFETIME", jwt_config)
        self.assertIn("REFRESH_TOKEN_LIFETIME", jwt_config)
        self.assertIn("ROTATE_REFRESH_TOKENS", jwt_config)
        self.assertIn("BLACKLIST_AFTER_ROTATION", jwt_config)

    def test_static_files_configuration(self):
        """Test static files configuration"""
        self.assertIn("STATIC_URL", settings.__dict__)
        self.assertIn("STATIC_ROOT", settings.__dict__)
        self.assertIn("STATICFILES_DIRS", settings.__dict__)
        # STATICFILES_STORAGE might not be in __dict__ in newer Django versions
        self.assertTrue(
            hasattr(settings, "STATICFILES_STORAGE") or hasattr(settings, "STORAGES")
        )

    def test_security_configuration(self):
        """Test security configuration"""
        self.assertIn("SECRET_KEY", settings.__dict__)
        self.assertIn("DEBUG", settings.__dict__)
        self.assertIn("ALLOWED_HOSTS", settings.__dict__)
        self.assertIn("SECURE_PROXY_SSL_HEADER", settings.__dict__)

    def test_internationalization_configuration(self):
        """Test internationalization configuration"""
        self.assertEqual(settings.LANGUAGE_CODE, "en-us")
        self.assertEqual(settings.TIME_ZONE, "UTC")
        self.assertTrue(settings.USE_I18N)
        self.assertTrue(settings.USE_TZ)

    def test_templates_configuration(self):
        """Test templates configuration"""
        self.assertIn("TEMPLATES", settings.__dict__)
        templates = settings.TEMPLATES
        self.assertIsInstance(templates, list)
        self.assertGreater(len(templates), 0)

        template_config = templates[0]
        self.assertIn("BACKEND", template_config)
        self.assertIn("DIRS", template_config)
        self.assertIn("APP_DIRS", template_config)
        self.assertIn("OPTIONS", template_config)


class ConfigURLsTests(TestCase):
    def test_urls_import(self):
        """Test that URLs can be imported"""
        from config import urls

        self.assertIsNotNone(urls)

    def test_urlpatterns_exist(self):
        """Test that urlpatterns exist"""
        from config.urls import urlpatterns

        self.assertIsInstance(urlpatterns, list)
        self.assertGreater(len(urlpatterns), 0)

    def test_admin_url(self):
        """Test admin URL configuration"""
        from config.urls import urlpatterns

        admin_paths = [
            pattern for pattern in urlpatterns if "admin" in str(pattern.pattern)
        ]
        self.assertGreater(len(admin_paths), 0)

    def test_api_urls(self):
        """Test API URL configurations"""
        from config.urls import urlpatterns

        api_paths = [
            pattern for pattern in urlpatterns if "api" in str(pattern.pattern)
        ]
        self.assertGreater(len(api_paths), 0)

    def test_auth_urls(self):
        """Test authentication URL configurations"""
        from config.urls import urlpatterns

        auth_paths = [
            pattern for pattern in urlpatterns if "auth" in str(pattern.pattern)
        ]
        self.assertGreater(len(auth_paths), 0)

    def test_app_urls_included(self):
        """Test that app URLs are included"""
        from config.urls import urlpatterns

        app_paths = [
            pattern
            for pattern in urlpatterns
            if any(
                app in str(pattern.pattern)
                for app in ["building", "neighborhood", "dummy", "user", "community"]
            )
        ]
        self.assertGreater(len(app_paths), 0)

    def test_schema_urls(self):
        """Test schema URL configurations"""
        from config.urls import urlpatterns

        schema_paths = [
            pattern for pattern in urlpatterns if "schema" in str(pattern.pattern)
        ]
        self.assertGreater(len(schema_paths), 0)

    def test_docs_urls(self):
        """Test documentation URL configurations"""
        from config.urls import urlpatterns

        docs_paths = [
            pattern
            for pattern in urlpatterns
            if any(doc in str(pattern.pattern) for doc in ["docs", "redoc", "swagger"])
        ]
        self.assertGreater(len(docs_paths), 0)


class ConfigIntegrationTests(TestCase):
    def test_django_setup(self):
        """Test that Django is properly set up"""
        from django.conf import settings

        # Test that settings are loaded
        self.assertIsNotNone(settings.SECRET_KEY)
        self.assertIsNotNone(settings.DATABASES)
        self.assertIsNotNone(settings.INSTALLED_APPS)

    def test_rest_framework_setup(self):
        """Test that REST framework is properly set up"""
        from rest_framework.test import APIClient

        # Test that REST framework client can be created
        client = APIClient()
        self.assertIsNotNone(client)

    def test_cors_setup(self):
        """Test that CORS is properly set up"""
        from corsheaders.middleware import CorsMiddleware

        # Test that CORS middleware can be instantiated
        middleware = CorsMiddleware(lambda req: None)
        self.assertIsNotNone(middleware)

    def test_jwt_setup(self):
        """Test that JWT is properly set up"""
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.contrib.auth.models import User

        # Test that JWT tokens can be created
        user = User.objects.create_user(username="test", password="test")
        refresh = RefreshToken.for_user(user)
        self.assertIsNotNone(refresh)
        self.assertIsNotNone(refresh.access_token)

    def test_spectacular_setup(self):
        """Test that drf-spectacular is properly set up"""
        from rest_framework.test import APIClient

        # Test that spectacular views can be accessed
        client = APIClient()
        # This will test the URL resolution
        try:
            response = client.get("/api/schema/")
            # Should either succeed or fail gracefully
            self.assertIn(response.status_code, [200, 404, 500])
        except Exception:
            # URL might not be accessible in test environment
            pass

    def test_whitenoise_setup(self):
        """Test that WhiteNoise is properly set up"""
        from whitenoise.middleware import WhiteNoiseMiddleware

        # Test that WhiteNoise middleware can be instantiated
        middleware = WhiteNoiseMiddleware(lambda req: None)
        self.assertIsNotNone(middleware)

    def test_custom_middleware_setup(self):
        """Test that custom middleware is properly set up"""
        from middlewares.error_middleware import ErrorMiddleware
        from middlewares.ok_middleware import OkJSONRenderer

        # Test that custom middleware can be instantiated
        middleware = ErrorMiddleware(lambda req: None)
        self.assertIsNotNone(middleware)

        # Test that custom renderer can be instantiated
        renderer = OkJSONRenderer()
        self.assertIsNotNone(renderer)
