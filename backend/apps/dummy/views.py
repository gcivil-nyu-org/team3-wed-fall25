# Create your views here.
# backend/apps/dummy/views.py
from typing import Any, Dict

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.exceptions.db_error import DatabaseError
from infrastructures.postgres.postgres_client import PostgresClient

from .serializers import (
    DummyItemCreateSerializer,
    DummyItemSerializer,
    DummyItemUpdateSerializer,
)


def _row_to_item(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "detail": row.get("detail") or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


class DummyItemListCreateView(APIView):
    def get(self, request):
        try:
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT id, title, detail, created_at, updated_at
                    FROM demo_item
                    ORDER BY id DESC
                    """
                )
            data = [_row_to_item(r) for r in rows]
            return Response(data, status=status.HTTP_200_OK)
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        serializer = DummyItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            with PostgresClient() as db:
                new_id = db.execute(
                    """
                    INSERT INTO demo_item(title, detail)
                    VALUES(%s, %s)
                    RETURNING id
                    """,
                    (payload["title"], payload.get("detail", "")),
                    returning="id",
                )
                row = db.query_one(
                    """
                    SELECT id, title, detail, created_at, updated_at
                    FROM demo_item WHERE id=%s
                    """,
                    (new_id,),
                )
            return Response(
                DummyItemSerializer(_row_to_item(row)).data,
                status=status.HTTP_201_CREATED,
            )
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DummyItemDetailView(APIView):
    def get_object(self, item_id: int):
        with PostgresClient() as db:
            row = db.query_one(
                """
                SELECT id, title, detail, created_at, updated_at
                FROM demo_item WHERE id=%s
                """,
                (item_id,),
            )
        return row

    def get(self, request, item_id: int):
        try:
            row = self.get_object(item_id)
            if not row:
                return Response(
                    {"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                DummyItemSerializer(_row_to_item(row)).data, status=status.HTTP_200_OK
            )
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, item_id: int):
        serializer = DummyItemCreateSerializer(data=request.data)  # title 필수
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            with PostgresClient() as db:
                # 존재 확인
                exists = db.exists("SELECT 1 FROM demo_item WHERE id=%s", (item_id,))
                if not exists:
                    return Response(
                        {"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND
                    )

                db.execute(
                    """
                    UPDATE demo_item
                    SET title=%s, detail=%s, updated_at=NOW()
                    WHERE id=%s
                    """,
                    (payload["title"], payload.get("detail", ""), item_id),
                )
                row = db.query_one(
                    """
                    SELECT id, title, detail, created_at, updated_at
                    FROM demo_item WHERE id=%s
                    """,
                    (item_id,),
                )
            return Response(
                DummyItemSerializer(_row_to_item(row)).data, status=status.HTTP_200_OK
            )
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, item_id: int):
        serializer = DummyItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        if not payload:
            return Response(
                {"detail": "No fields to update"}, status=status.HTTP_400_BAD_REQUEST
            )

        fields = []
        params = []
        if "title" in payload:
            fields.append("title=%s")
            params.append(payload["title"])
        if "detail" in payload:
            fields.append("detail=%s")
            params.append(payload["detail"])
        fields.append("updated_at=NOW()")

        try:
            with PostgresClient() as db:
                exists = db.exists("SELECT 1 FROM demo_item WHERE id=%s", (item_id,))
                if not exists:
                    return Response(
                        {"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND
                    )

                sql = f"UPDATE demo_item SET {', '.join(fields)} WHERE id=%s"
                params.append(item_id)
                db.execute(sql, tuple(params))

                row = db.query_one(
                    "SELECT id, title, detail, created_at, updated_at FROM demo_item WHERE id=%s",
                    (item_id,),
                )
            return Response(
                DummyItemSerializer(_row_to_item(row)).data, status=status.HTTP_200_OK
            )
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, item_id: int):
        try:
            with PostgresClient() as db:
                count = db.execute("DELETE FROM demo_item WHERE id=%s", (item_id,))
            if count == 0:
                return Response(
                    {"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND
                )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DatabaseError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
