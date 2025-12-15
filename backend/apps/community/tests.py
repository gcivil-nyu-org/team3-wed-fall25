# apps/community/tests/test_community_views.py

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.community.views import _to_summary_dict

from apps.community.models import (
    CommunityFavorites,
    CommunityMessages,
    CommunityReviewComments,
    CommunityReviews,
)

User = get_user_model()


class CommunityViewsTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="pass1234"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="pass1234"
        )
        self.client.force_authenticate(user=self.user1)
        self.sample_bbl = "1-23456-7890"

    # =========================================================
    # FAVORITES
    # =========================================================
    def test_favorites_create_list_and_delete(self):
        url = reverse("favorites_list_create")

        # initial GET (no favorites yet)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

        # POST: add favorite
        res_create = self.client.post(url, {"bbl": self.sample_bbl}, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        fav_id = res_create.data["id"]

        # duplicate POST → 400
        res_dup = self.client.post(url, {"bbl": self.sample_bbl}, format="json")
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # GET again → one favorite
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data), 1)
        self.assertEqual(res2.data[0]["bbl"], self.sample_bbl)
        # registration summary key exists (even if None)
        self.assertIn("registration", res2.data[0])

        # DELETE: soft delete
        del_url = reverse("favorites_delete", args=[fav_id])
        res_del = self.client.delete(del_url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)

        # DELETE again → 404
        res_del2 = self.client.delete(del_url)
        self.assertEqual(res_del2.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================
    # REVIEWS (MVP + my_reviews + update/delete)
    # =========================================================
    def test_reviews_list_create_and_my_reviews(self):
        list_url = reverse("reviews_list_create")

        # GET without bbl → 400
        res_missing = self.client.get(list_url)
        self.assertEqual(res_missing.status_code, status.HTTP_400_BAD_REQUEST)

        # POST: create review
        payload = {
            "bbl": self.sample_bbl,
            "rating": 4,
            "title": "Good place",
            "body": "Nice building overall",
        }
        res_create = self.client.post(list_url, payload, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        review_id = res_create.data["id"]

        # GET with bbl → 200, 1 item
        res_list = self.client.get(list_url, {"bbl": self.sample_bbl})
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)
        self.assertEqual(res_list.data[0]["id"], review_id)

        # my_reviews
        my_url = reverse("my_reviews")
        res_my = self.client.get(my_url)
        self.assertEqual(res_my.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_my.data), 1)
        self.assertEqual(res_my.data[0]["id"], review_id)

    def test_reviews_create_requires_auth(self):
        self.client.force_authenticate(user=None)
        list_url = reverse("reviews_list_create")
        res = self.client.post(
            list_url,
            {
                "bbl": self.sample_bbl,
                "rating": 5,
                "title": "Test",
                "body": "Body",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reviews_update_and_delete_and_not_found(self):
        # create review as user1
        review = CommunityReviews.objects.create(
            user_id=self.user1.id,
            bbl=self.sample_bbl,
            rating=3,
            title="Old title",
            body="Old body",
        )
        url = reverse("reviews_update_delete", args=[review.id])

        # PUT update
        res_put = self.client.put(
            url,
            {"title": "New title", "body": "New body"},
            format="json",
        )
        self.assertEqual(res_put.status_code, status.HTTP_200_OK)
        self.assertEqual(res_put.data["title"], "New title")

        # DELETE
        res_del = self.client.delete(url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)

        # DELETE again → 404
        res_del2 = self.client.delete(url)
        self.assertEqual(res_del2.status_code, status.HTTP_404_NOT_FOUND)

        # review owned by other user → 404 for user1
        other_review = CommunityReviews.objects.create(
            user_id=self.user2.id,
            bbl=self.sample_bbl,
            rating=5,
            title="Other",
            body="Body",
        )
        url_other = reverse("reviews_update_delete", args=[other_review.id])
        res_unauth_del = self.client.delete(url_other)
        self.assertEqual(res_unauth_del.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================
    # PUBLIC REVIEWS (참고용 – pragma: no cover 라서 커버리지는 안 올라가지만,
    # 에러 없이 동작하는지만 확인)
    # =========================================================
    @patch("infrastructures.postgres.postgres_client.PostgresClient")
    def test_public_reviews_success_and_error(self, mock_client):
        # 성공 케이스
        instance = mock_client.return_value.__enter__.return_value
        instance.query_all.return_value = [
            {
                "id": 1,
                "user_id": self.user1.id,
                "bbl": self.sample_bbl,
                "rating": 4,
                "title": "Pub",
                "body": "Public review",
                "created_at": timezone.now(),
                "updated_at": None,
                "borough": "BK",
                "zip": "11201",
                "house_number": "123",
                "street_name": "Main St",
            }
        ]
        url = reverse("public_reviews")
        res = self.client.get(
            url,
            {
                "borough": "BK",
                "zip": "11201",
                "bbl": self.sample_bbl,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        # 에러 케이스
        instance.query_all.side_effect = Exception("db error")
        res_err = self.client.get(url)
        self.assertEqual(res_err.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # =========================================================
    # REVIEW COMMENTS
    # =========================================================
    def test_review_comments_flow_and_auth(self):
        review = CommunityReviews.objects.create(
            user_id=self.user1.id,
            bbl=self.sample_bbl,
            rating=4,
            title="Review",
            body="Content",
        )

        url = reverse("review_comments_list_create")

        # GET without review_id → 400
        res_missing = self.client.get(url)
        self.assertEqual(res_missing.status_code, status.HTTP_400_BAD_REQUEST)

        # POST comment (auth ok)
        res_create = self.client.post(
            url,
            {"review_id": review.id, "body": "First comment"},
            format="json",
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        comment_id = res_create.data["id"]

        # GET with review_id
        res_list = self.client.get(url, {"review_id": review.id})
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        # DELETE as author
        del_url = reverse("review_comments_delete", args=[comment_id])
        res_del = self.client.delete(del_url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)

        # DELETE again → 404
        res_del2 = self.client.delete(del_url)
        self.assertEqual(res_del2.status_code, status.HTTP_404_NOT_FOUND)

        # auth required for POST
        self.client.force_authenticate(user=None)
        res_no_auth = self.client.post(
            url,
            {"review_id": review.id, "body": "No auth"},
            format="json",
        )
        self.assertEqual(res_no_auth.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================
    # MESSAGES: inbox / outbox / send / read / delete
    # =========================================================
    def test_messages_send_inbox_outbox_mark_read_and_delete(self):
        send_url = reverse("messages_send")

        # 정상 메시지 전송
        res_send = self.client.post(
            send_url,
            {"receiver_id": self.user2.id, "body": "Hello"},
            format="json",
        )
        self.assertEqual(res_send.status_code, status.HTTP_201_CREATED)
        msg_id = res_send.data["id"]

        # empty body → 400
        res_empty = self.client.post(
            send_url,
            {"receiver_id": self.user2.id, "body": " "},
            format="json",
        )
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)

        # inbox / outbox (user2)
        self.client.force_authenticate(user=self.user2)
        inbox_url = reverse("messages_inbox")
        outbox_url = reverse("messages_outbox")

        res_inbox = self.client.get(inbox_url)
        self.assertEqual(res_inbox.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_inbox.data), 1)

        res_outbox = self.client.get(outbox_url)
        self.assertEqual(res_outbox.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_outbox.data), 0)

        # mark_read
        mark_url = reverse("messages_mark_read", args=[msg_id])
        res_mark = self.client.put(mark_url)
        self.assertEqual(res_mark.status_code, status.HTTP_200_OK)

        # non-existent message → 404
        res_mark_404 = self.client.put(reverse("messages_mark_read", args=[999999]))
        self.assertEqual(res_mark_404.status_code, status.HTTP_404_NOT_FOUND)

        # delete (as receiver)
        delete_url = reverse("messages_delete", args=[msg_id])
        res_del = self.client.delete(delete_url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)

        # delete again → 404
        res_del2 = self.client.delete(delete_url)
        self.assertEqual(res_del2.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================
    # MESSAGES THREAD (모든 주요 분기)
    # =========================================================
    def test_messages_thread_get_and_post_variants(self):
        thread_url = reverse("messages_thread")
        self.client.force_authenticate(user=self.user1)

        # GET without peer_id → 400
        res_no_peer = self.client.get(thread_url)
        self.assertEqual(res_no_peer.status_code, status.HTTP_400_BAD_REQUEST)

        # message 몇 개 생성 (bbl 있는 것 / 없는 것 섞어서)
        for i in range(3):
            CommunityMessages.objects.create(
                sender_id=self.user1.id,
                receiver_id=self.user2.id,
                bbl=self.sample_bbl if i % 2 == 0 else None,
                body=f"msg {i}",
            )

        # initial GET
        res_init = self.client.get(thread_url, {"peer_id": self.user2.id})
        self.assertEqual(res_init.status_code, status.HTTP_200_OK)
        self.assertIn("messages", res_init.data)
        self.assertGreaterEqual(len(res_init.data["messages"]), 1)

        messages = res_init.data["messages"]
        first_id = messages[0]["id"]
        last_id = messages[-1]["id"]

        # order=desc
        res_desc = self.client.get(
            thread_url,
            {"peer_id": self.user2.id, "order": "desc"},
        )
        self.assertEqual(res_desc.status_code, status.HTTP_200_OK)

        # both since_id & before_id → 400
        res_conflict = self.client.get(
            thread_url,
            {
                "peer_id": self.user2.id,
                "since_id": first_id,
                "before_id": last_id,
            },
        )
        self.assertEqual(res_conflict.status_code, status.HTTP_400_BAD_REQUEST)

        # since_id only
        res_since = self.client.get(
            thread_url,
            {"peer_id": self.user2.id, "since_id": first_id},
        )
        self.assertEqual(res_since.status_code, status.HTTP_200_OK)

        # before_id only
        res_before = self.client.get(
            thread_url,
            {"peer_id": self.user2.id, "before_id": last_id},
        )
        self.assertEqual(res_before.status_code, status.HTTP_200_OK)

        # mark_read = true
        res_mark = self.client.get(
            thread_url,
            {"peer_id": self.user2.id, "mark_read": "true"},
        )
        self.assertEqual(res_mark.status_code, status.HTTP_200_OK)

        # POST: invalid peer_id (string) → 400
        res_bad_peer = self.client.post(
            thread_url,
            {"peer_id": "abc", "body": "test"},
            format="json",
        )
        self.assertEqual(res_bad_peer.status_code, status.HTTP_400_BAD_REQUEST)

        # POST: self message → 400
        res_self = self.client.post(
            thread_url,
            {"peer_id": self.user1.id, "body": "self"},
            format="json",
        )
        self.assertEqual(res_self.status_code, status.HTTP_400_BAD_REQUEST)

        # POST: missing body → 400
        res_no_body = self.client.post(
            thread_url,
            {"peer_id": self.user2.id},
            format="json",
        )
        self.assertEqual(res_no_body.status_code, status.HTTP_400_BAD_REQUEST)

        # POST: 정상 메시지 전송
        res_post = self.client.post(
            thread_url,
            {
                "peer_id": self.user2.id,
                "bbl": self.sample_bbl,
                "body": "via thread",
            },
            format="json",
        )
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)

    # =========================================================
    # MESSAGE THREADS SIMPLE (대화방 목록)
    # =========================================================
    def test_message_threads_simple(self):
        # user1 ↔ user2 메시지 여러 개
        CommunityMessages.objects.create(
            sender_id=self.user1.id,
            receiver_id=self.user2.id,
            body="u1 to u2",
        )
        CommunityMessages.objects.create(
            sender_id=self.user2.id,
            receiver_id=self.user1.id,
            body="u2 to u1",
        )

        url = reverse("message_threads_simple")
        self.client.force_authenticate(user=self.user1)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

        thread = res.data[0]
        self.assertIn("peer", thread)
        self.assertIn("last_message", thread)
        self.assertIn("is_unread", thread)

    # =========================================================
    # 추가 FAVORITES 테스트 (invalid + repo 예외)
    # =========================================================
    def test_favorites_create_invalid_data_returns_400(self):
        url = reverse("favorites_list_create")

        # bbl 없이 보내기 → serializer invalid
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.community.views.BuildingRepository")
    def test_favorites_list_handles_registration_error(self, mock_repo_cls):
        # 즐겨찾기 1개 만들어 놓기
        CommunityFavorites.objects.create(
            user_id=self.user1.id,
            bbl=self.sample_bbl,
        )

        # repo.get_registration_by_bbl 이 예외 발생하도록 설정
        instance = mock_repo_cls.return_value
        instance.get_registration_by_bbl.side_effect = Exception("boom")

        url = reverse("favorites_list_create")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["bbl"], self.sample_bbl)
        # 에러 나도 registration 키는 존재하고 None 이어야 함
        self.assertIn("registration", res.data[0])
        self.assertIsNone(res.data[0]["registration"])

    # =========================================================
    # _to_summary_dict 단위 테스트
    # =========================================================
    def test_to_summary_dict_none_returns_none(self):
        result = _to_summary_dict(None)
        self.assertIsNone(result)

    def test_to_summary_dict_builds_address_and_contacts(self):
        now = timezone.now()
        reg = {
            "bbl": self.sample_bbl,
            "registration_id": 123,
            "building_id": 456,
            "boro_id": 3,
            "boro": "BROOKLYN",
            "block": "0001",
            "lot": "0002",
            "house_number": "123",
            "street_name": "Main St",
            "zip": "11201",
            "community_board": "301",
            "last_registration_date": now,
            "registration_end_date": None,
            "contacts": [
                {
                    "type": "Owner",
                    "first_name": "John",
                    "last_name": "Doe",
                    "corporation_name": None,
                    "contact_description": "Primary owner",
                    "business_zip": "10001",
                }
            ],
        }

        result = _to_summary_dict(reg)
        self.assertIsNotNone(result)
        self.assertEqual(result["bbl"], self.sample_bbl)
        self.assertEqual(
            result["address"]["full"],
            "123 Main St, BROOKLYN 11201",
        )
        self.assertEqual(result["contacts_count"], 1)
        self.assertEqual(len(result["contacts_preview"]), 1)
        self.assertEqual(
            result["contacts_preview"][0]["name"],
            "John Doe",
        )

    # =========================================================
    # REVIEWS: invalid POST & invalid PUT
    # =========================================================
    def test_reviews_create_invalid_data_returns_400(self):
        url = reverse("reviews_list_create")
        payload = {
            "bbl": self.sample_bbl,
            # title/body 빠뜨려서 invalid 만들기
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviews_update_invalid_data_returns_400(self):
        review = CommunityReviews.objects.create(
            user_id=self.user1.id,
            bbl=self.sample_bbl,
            rating=3,
            title="Old",
            body="Old body",
        )
        url = reverse("reviews_update_delete", args=[review.id])

        # rating을 잘못된 값(6.0)으로 보내서 validator 깨지게
        res = self.client.put(
            url,
            {"rating": 6.0},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # REVIEW COMMENTS: invalid POST
    # =========================================================
    def test_review_comments_create_invalid_data_returns_400(self):
        review = CommunityReviews.objects.create(
            user_id=self.user1.id,
            bbl=self.sample_bbl,
            rating=4,
            title="Review",
            body="Body",
        )

        url = reverse("review_comments_list_create")

        # body 없이 보내기 → invalid
        res = self.client.post(
            url,
            {"review_id": review.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # MESSAGES THREAD: bbl 필터 및 limit ValueError 분기
    # =========================================================
    def test_messages_thread_filters_by_bbl(self):
        self.client.force_authenticate(user=self.user1)

        # 같은 peer, 서로 다른 bbl 메시지 두 개
        msg1 = CommunityMessages.objects.create(
            sender_id=self.user1.id,
            receiver_id=self.user2.id,
            bbl=self.sample_bbl,
            body="with bbl",
        )
        msg2 = CommunityMessages.objects.create(
            sender_id=self.user1.id,
            receiver_id=self.user2.id,
            bbl="9-99999-9999",
            body="other bbl",
        )

        url = reverse("messages_thread")

        # bbl 지정해서 호출 → sample_bbl 메시지만 나와야 함
        res = self.client.get(
            url,
            {"peer_id": self.user2.id, "bbl": self.sample_bbl},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [m["id"] for m in res.data["messages"]]
        self.assertIn(msg1.id, ids)
        self.assertNotIn(msg2.id, ids)

    def test_messages_thread_invalid_limit_falls_back_to_default(self):
        self.client.force_authenticate(user=self.user1)

        # 메시지 몇 개 생성
        for i in range(3):
            CommunityMessages.objects.create(
                sender_id=self.user1.id,
                receiver_id=self.user2.id,
                body=f"msg {i}",
            )

        url = reverse("messages_thread")

        # limit=abc → ValueError → 내부에서 50으로 fallback (에러 없이 200 이어야 함)
        res = self.client.get(
            url,
            {"peer_id": self.user2.id, "limit": "abc"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("messages", res.data)
        self.assertGreaterEqual(len(res.data["messages"]), 1)
