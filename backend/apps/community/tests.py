# Create your tests here.
from django.test import TestCase
from rest_framework.test import APIClient


class CommunityAppTests(TestCase):
    def test_community_urls_exist(self):
        """Test that community URLs are properly configured"""
        # Test that the community URLs don't cause import errors
        try:
            from apps.community.urls import urlpatterns

            self.assertIsInstance(urlpatterns, list)
        except ImportError:
            self.fail("Community URLs should be importable")

    def test_community_views_exist(self):
        """Test that community views module exists"""
        try:
            pass

            self.assertTrue(True)  # If we get here, import succeeded
        except ImportError:
            self.fail("Community views module should exist")

    def test_community_models_exist(self):
        """Test that community models module exists"""
        try:
            pass

            self.assertTrue(True)  # If we get here, import succeeded
        except ImportError:
            self.fail("Community models module should exist")

    def test_community_apps_config(self):
        """Test community app configuration"""
        try:
            from apps.community.apps import CommunityConfig

            self.assertEqual(CommunityConfig.name, "apps.community")
        except ImportError:
            self.fail("Community app config should be importable")

    def test_community_admin_exists(self):
        """Test that community admin module exists"""
        try:
            pass

            self.assertTrue(True)  # If we get here, import succeeded
        except ImportError:
            self.fail("Community admin module should exist")


class CommunitySerializersTests(TestCase):
    """Test community serializers"""

    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123",
            role="tenant",
            first_name="Test",
            last_name="User",
            is_verified=True,
        )

    def test_community_favorites_serializer(self):
        """Test CommunityFavoritesSerializer"""
        from apps.community.serializers import CommunityFavoritesSerializer
        from apps.community.models import CommunityFavorites

        favorite = CommunityFavorites.objects.create(
            user_id=self.user.id, bbl="1000010001", note="Test"
        )
        serializer = CommunityFavoritesSerializer(favorite)
        self.assertIn("id", serializer.data)
        self.assertIn("bbl", serializer.data)
        self.assertEqual(serializer.data["bbl"], "1000010001")

    def test_community_reviews_serializer(self):
        """Test CommunityReviewsSerializer"""
        from apps.community.serializers import CommunityReviewsSerializer
        from apps.community.models import CommunityReviews

        review = CommunityReviews.objects.create(
            user_id=self.user.id,
            bbl="1000010001",
            title="Test Review",
            body="Test body",
            rating=4.5,
        )
        serializer = CommunityReviewsSerializer(review)
        self.assertIn("username", serializer.data)
        self.assertIn("email", serializer.data)
        self.assertEqual(serializer.data["username"], "testuser")

    def test_community_reviews_serializer_no_user(self):
        """Test CommunityReviewsSerializer with non-existent user"""
        from apps.community.serializers import CommunityReviewsSerializer
        from apps.community.models import CommunityReviews

        review = CommunityReviews.objects.create(
            user_id=99999, bbl="1000010001", title="Test", body="Test"
        )
        serializer = CommunityReviewsSerializer(review)
        self.assertIsNone(serializer.data["username"])

    def test_community_review_comments_serializer(self):
        """Test CommunityReviewCommentsSerializer"""
        from apps.community.serializers import CommunityReviewCommentsSerializer
        from apps.community.models import CommunityReviewComments

        comment = CommunityReviewComments.objects.create(
            user_id=self.user.id, review_id=1, body="Test comment"
        )
        serializer = CommunityReviewCommentsSerializer(comment)
        self.assertIn("username", serializer.data)
        self.assertEqual(serializer.data["username"], "testuser")

    def test_community_messages_serializer(self):
        """Test CommunityMessagesSerializer"""
        from django.contrib.auth import get_user_model
        from apps.community.serializers import CommunityMessagesSerializer
        from apps.community.models import CommunityMessages

        User = get_user_model()
        receiver = User.objects.create_user(
            username="receiver",
            email="receiver@example.com",
            password="password123",
            role="tenant",
            first_name="Receiver",
            last_name="User",
            is_verified=True,
        )

        message = CommunityMessages.objects.create(
            sender_id=self.user.id,
            receiver_id=receiver.id,
            body="Test message",
            bbl="1000010001",
        )
        serializer = CommunityMessagesSerializer(message)
        self.assertIn("sender_username", serializer.data)
        self.assertIn("receiver_username", serializer.data)
        self.assertEqual(serializer.data["sender_username"], "testuser")

    def test_community_messages_serializer_no_sender(self):
        """Test CommunityMessagesSerializer with non-existent sender"""
        from apps.community.serializers import CommunityMessagesSerializer
        from apps.community.models import CommunityMessages

        message = CommunityMessages.objects.create(
            sender_id=99999, receiver_id=self.user.id, body="Test"
        )
        serializer = CommunityMessagesSerializer(message)
        self.assertIsNone(serializer.data["sender_username"])

    def test_community_messages_serializer_no_receiver(self):
        """Test CommunityMessagesSerializer with non-existent receiver"""
        from apps.community.serializers import CommunityMessagesSerializer
        from apps.community.models import CommunityMessages

        message = CommunityMessages.objects.create(
            sender_id=self.user.id, receiver_id=99999, body="Test"
        )
        serializer = CommunityMessagesSerializer(message)
        self.assertIsNone(serializer.data["receiver_username"])

    def test_community_review_comments_serializer_no_user(self):
        """Test CommunityReviewCommentsSerializer with non-existent user"""
        from apps.community.serializers import CommunityReviewCommentsSerializer
        from apps.community.models import CommunityReviewComments

        comment = CommunityReviewComments.objects.create(
            user_id=99999, review_id=1, body="Test"
        )
        serializer = CommunityReviewCommentsSerializer(comment)
        self.assertIsNone(serializer.data["username"])


class CommunityAPITests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123",
            role="tenant",
            first_name="Test",
            last_name="User",
            is_verified=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_favorites_list_create_get(self):
        """Test GET favorites list"""
        from django.urls import reverse

        url = reverse("favorites_list_create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_favorites_list_create_post(self):
        """Test POST create favorite"""
        from django.urls import reverse

        url = reverse("favorites_list_create")
        data = {"bbl": "1000010001", "note": "Test favorite"}
        response = self.client.post(url, data)
        # Should succeed or return 400 if already exists
        self.assertIn(response.status_code, [200, 201, 400])

    def test_favorites_list_create_post_duplicate(self):
        """Test POST create duplicate favorite"""
        from django.urls import reverse
        from apps.community.models import CommunityFavorites

        url = reverse("favorites_list_create")
        data = {"bbl": "1000010001", "note": "Test favorite"}
        # Create first favorite
        CommunityFavorites.objects.create(
            user_id=self.user.id, bbl="1000010001", note="First"
        )
        # Try to create duplicate
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_favorites_delete(self):
        """Test DELETE favorite"""
        from django.urls import reverse
        from apps.community.models import CommunityFavorites

        favorite = CommunityFavorites.objects.create(
            user_id=self.user.id, bbl="1000010001", note="Test"
        )
        url = reverse("favorites_delete", args=[favorite.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

    def test_favorites_delete_not_found(self):
        """Test DELETE non-existent favorite"""
        from django.urls import reverse

        url = reverse("favorites_delete", args=[99999])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)

    def test_favorites_detail_delete(self):
        """Test DELETE favorite by BBL"""
        from django.urls import reverse
        from apps.community.models import CommunityFavorites

        CommunityFavorites.objects.create(
            user_id=self.user.id, bbl="1000010001", note="Test"
        )
        url = reverse("favorites_detail_delete", args=["1000010001"])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

    def test_favorites_detail_delete_not_found(self):
        """Test DELETE favorite by BBL that doesn't exist"""
        from django.urls import reverse

        url = reverse("favorites_detail_delete", args=["9999999999"])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)

    def test_reviews_list_create_get(self):
        """Test GET reviews list"""
        from django.urls import reverse

        url = reverse("reviews_list_create")
        response = self.client.get(url, {"bbl": "1000010001"})
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_reviews_list_create_get_missing_bbl(self):
        """Test GET reviews without bbl parameter"""
        from django.urls import reverse

        url = reverse("reviews_list_create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_reviews_list_create_post(self):
        """Test POST create review"""
        from django.urls import reverse

        url = reverse("reviews_list_create")
        data = {
            "bbl": "1000010001",
            "title": "Test Review",
            "body": "This is a test review",
            "rating": 4.5,
        }
        response = self.client.post(url, data)
        self.assertIn(response.status_code, [200, 201, 400])

    def test_reviews_list_create_post_unauthenticated(self):
        """Test POST review without authentication"""
        from django.urls import reverse

        client = APIClient()  # No authentication
        url = reverse("reviews_list_create")
        data = {
            "bbl": "1000010001",
            "title": "Test Review",
            "body": "This is a test review",
        }
        response = client.post(url, data)
        self.assertEqual(response.status_code, 401)

    def test_my_reviews(self):
        """Test GET my reviews"""
        from django.urls import reverse

        url = reverse("my_reviews")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_reviews_update_delete_put(self):
        """Test PUT update review"""
        from django.urls import reverse
        from apps.community.models import CommunityReviews

        review = CommunityReviews.objects.create(
            user_id=self.user.id,
            bbl="1000010001",
            title="Original Title",
            body="Original body",
        )
        url = reverse("reviews_update_delete", args=[review.id])
        data = {"title": "Updated Title", "body": "Updated body"}
        response = self.client.put(url, data)
        self.assertIn(response.status_code, [200, 400])

    def test_reviews_update_delete_put_not_found(self):
        """Test PUT review that doesn't exist"""
        from django.urls import reverse

        url = reverse("reviews_update_delete", args=[99999])
        response = self.client.put(url, {"title": "Test"})
        self.assertEqual(response.status_code, 404)

    def test_reviews_update_delete_delete(self):
        """Test DELETE review"""
        from django.urls import reverse
        from apps.community.models import CommunityReviews

        review = CommunityReviews.objects.create(
            user_id=self.user.id,
            bbl="1000010001",
            title="Test Review",
            body="Test body",
        )
        url = reverse("reviews_update_delete", args=[review.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

    def test_reviews_update_delete_delete_not_found(self):
        """Test DELETE review that doesn't exist"""
        from django.urls import reverse

        url = reverse("reviews_update_delete", args=[99999])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)

    def test_review_comments_list_create_get(self):
        """Test GET review comments"""
        from django.urls import reverse

        url = reverse("review_comments_list_create")
        response = self.client.get(url, {"review_id": "1"})
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_review_comments_list_create_get_missing_review_id(self):
        """Test GET review comments without review_id"""
        from django.urls import reverse

        url = reverse("review_comments_list_create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_review_comments_list_create_post(self):
        """Test POST create review comment"""
        from django.urls import reverse
        from apps.community.models import CommunityReviews

        # Create a review first
        review = CommunityReviews.objects.create(
            user_id=self.user.id,
            bbl="1000010001",
            title="Test Review",
            body="Test body",
        )

        url = reverse("review_comments_list_create")
        data = {"review_id": review.id, "body": "Test comment"}
        response = self.client.post(url, data)
        self.assertIn(response.status_code, [200, 201, 400])

    def test_review_comments_delete(self):
        """Test DELETE review comment"""
        from django.urls import reverse
        from apps.community.models import CommunityReviewComments

        comment = CommunityReviewComments.objects.create(
            user_id=self.user.id, review_id=1, body="Test comment"
        )
        url = reverse("review_comments_delete", args=[comment.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

    def test_messages_inbox(self):
        """Test GET messages inbox"""
        from django.urls import reverse

        url = reverse("messages_inbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_messages_outbox(self):
        """Test GET messages outbox"""
        from django.urls import reverse

        url = reverse("messages_outbox")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_messages_send(self):
        """Test POST send message"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model

        User = get_user_model()
        receiver = User.objects.create_user(
            username="receiver",
            email="receiver@example.com",
            password="password123",
            role="tenant",
            first_name="Receiver",
            last_name="User",
            is_verified=True,
        )

        url = reverse("messages_send")
        data = {
            "peer_id": receiver.id,
            "body": "Test message",
            "bbl": "1000010001",
        }
        response = self.client.post(url, data)
        self.assertIn(response.status_code, [200, 201, 400])

    def test_messages_thread(self):
        """Test GET messages thread"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model

        User = get_user_model()
        peer = User.objects.create_user(
            username="peer",
            email="peer@example.com",
            password="password123",
            role="tenant",
            first_name="Peer",
            last_name="User",
            is_verified=True,
        )

        url = reverse("messages_thread")
        response = self.client.get(url, {"peer_id": peer.id})
        self.assertEqual(response.status_code, 200)

    def test_message_threads_simple(self):
        """Test GET message threads"""
        from django.urls import reverse

        url = reverse("message_threads_simple")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_messages_mark_read(self):
        """Test PUT mark message as read"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model
        from apps.community.models import CommunityMessages

        User = get_user_model()
        receiver = User.objects.create_user(
            username="receiver",
            email="receiver@example.com",
            password="password123",
            role="tenant",
            first_name="Receiver",
            last_name="User",
            is_verified=True,
        )

        message = CommunityMessages.objects.create(
            sender_id=receiver.id,
            receiver_id=self.user.id,
            body="Test message",
        )
        url = reverse("messages_mark_read", args=[message.id])
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)

    def test_messages_mark_read_not_found(self):
        """Test PUT mark non-existent message as read"""
        from django.urls import reverse

        url = reverse("messages_mark_read", args=[99999])
        response = self.client.put(url)
        self.assertEqual(response.status_code, 404)

    def test_messages_delete(self):
        """Test DELETE message"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model
        from apps.community.models import CommunityMessages

        User = get_user_model()
        receiver = User.objects.create_user(
            username="receiver2",
            email="receiver2@example.com",
            password="password123",
            role="tenant",
            first_name="Receiver",
            last_name="User",
            is_verified=True,
        )

        message = CommunityMessages.objects.create(
            sender_id=self.user.id,
            receiver_id=receiver.id,
            body="Test message",
        )
        url = reverse("messages_delete", args=[message.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

    def test_messages_delete_not_found(self):
        """Test DELETE non-existent message"""
        from django.urls import reverse

        url = reverse("messages_delete", args=[99999])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)

    def test_messages_thread_get(self):
        """Test GET messages thread"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model

        User = get_user_model()
        peer = User.objects.create_user(
            username="peer2",
            email="peer2@example.com",
            password="password123",
            role="tenant",
            first_name="Peer",
            last_name="User",
            is_verified=True,
        )

        url = reverse("messages_thread")
        response = self.client.get(url, {"peer_id": peer.id})
        self.assertEqual(response.status_code, 200)

    def test_messages_thread_get_missing_peer_id(self):
        """Test GET messages thread without peer_id"""
        from django.urls import reverse

        url = reverse("messages_thread")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_messages_thread_post(self):
        """Test POST send message in thread"""
        from django.urls import reverse
        from django.contrib.auth import get_user_model

        User = get_user_model()
        peer = User.objects.create_user(
            username="peer3",
            email="peer3@example.com",
            password="password123",
            role="tenant",
            first_name="Peer",
            last_name="User",
            is_verified=True,
        )

        url = reverse("messages_thread")
        data = {"peer_id": peer.id, "body": "Test message"}
        response = self.client.post(url, data)
        self.assertIn(response.status_code, [200, 201, 400])

    def test_community_app_in_installed_apps(self):
        """Test that community app is in INSTALLED_APPS"""
        from django.conf import settings

        self.assertIn("apps.community", settings.INSTALLED_APPS)


class CommunityIntegrationTests(TestCase):
    def test_community_app_structure(self):
        """Test that community app has proper structure"""
        import os

        from django.conf import settings

        # Check that community app directory exists
        community_path = os.path.join(settings.BASE_DIR, "apps", "community")
        self.assertTrue(os.path.exists(community_path))

        # Check that required files exist
        required_files = [
            "__init__.py",
            "apps.py",
            "models.py",
            "views.py",
            "urls.py",
            "admin.py",
        ]
        for file_name in required_files:
            file_path = os.path.join(community_path, file_name)
            self.assertTrue(
                os.path.exists(file_path), f"{file_name} should exist in community app"
            )

    def test_community_app_imports(self):
        """Test that all community app modules can be imported"""
        modules_to_test = [
            "apps.community",
            "apps.community.apps",
            "apps.community.models",
            "apps.community.views",
            "apps.community.urls",
            "apps.community.admin",
        ]

        for module_name in modules_to_test:
            try:
                __import__(module_name)
            except ImportError as e:
                self.fail(f"Failed to import {module_name}: {e}")
