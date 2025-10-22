# backend/tests/test_dummy_crud.py
from rest_framework import status
from rest_framework.test import APITestCase


class DummyCrudTests(APITestCase):
    def setUp(self):
        self.base = "/api/dummy/items"

    def test_crud_flow(self):
        # Create
        res = self.client.post(
            self.base, {"title": "hello", "detail": "world"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        item_id = res.data["id"]

        # Retrieve
        res = self.client.get(f"{self.base}/{item_id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "hello")

        # List
        res = self.client.get(self.base)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(x["id"] == item_id for x in res.data))

        # Put (full update)
        res = self.client.put(
            f"{self.base}/{item_id}", {"title": "new", "detail": "zzz"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "new")

        # Patch (partial)
        res = self.client.patch(
            f"{self.base}/{item_id}", {"detail": "ppp"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["detail"], "ppp")

        # Delete
        res = self.client.delete(f"{self.base}/{item_id}")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Not found after delete
        res = self.client.get(f"{self.base}/{item_id}")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
