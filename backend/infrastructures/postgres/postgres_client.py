# infrastructures/db/postgres_client.py

from typing import Any, Iterable, Optional, Sequence, Tuple, Union, List, Dict
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from utils.env_util import get_env
from exceptions.db_error import DatabaseError


class PostgresClient:
    """
    Usage:
        with client as db:
            user = db.query_one("SELECT id, username FROM auth_user WHERE id=%s", (1,))
            new_id = db.execute(
                "INSERT INTO some_table(col1,col2) VALUES(%s,%s) RETURNING id",
                ("a", "b"),
                returning="id",
            )
            rows = db.query_all("SELECT * FROM some_table")
    """

    def __init__(self):
        env = get_env()

        dbname = env("DB_NAME")
        user = env("DB_USER")
        password = env("DB_PASSWORD")
        host = env("DB_HOST", default="localhost")
        port = env("DB_PORT", default=5432)

        self._params = dict(
            dbname=dbname, user=user, password=password, host=host, port=port
        )

        self.conn = None



    def __enter__(self) -> "PostgresClient":
        try:
            self.conn = psycopg2.connect(**self._params)
            self.conn.autocommit = False
            return self
        except Exception as e:
            raise DatabaseError(f"Failed to connect to DB: {e}") from e

    def __exit__(self, exc_type, exc, tb):
        if self.conn is None:
            return False
        try:
            if exc_type is None:
                self.conn.commit()
            else:
                self.conn.rollback()
        finally:
            try:
                self.conn.close()
            finally:
                self.conn = None
        return False


    @contextmanager
    def _cursor(self):
        if self.conn is None:
            raise DatabaseError("Connection not initialized. Use 'with PostgresClient.from_env() as db:'")
        cur = None
        try:
            cur = self.conn.cursor(cursor_factory=RealDictCursor)
            yield cur
        except Exception as e:
            raise DatabaseError(str(e)) from e
        finally:
            if cur is not None:
                cur.close()


    def execute(
        self,
        sql: str,
        params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None,
        *,
        returning: Optional[str] = None,
    ) -> Union[int, Any]:
        with self._cursor() as cur:
            try:
                cur.execute(sql, params or None)
                if returning:
                    row = cur.fetchone()
                    if row is None or returning not in row:
                        raise DatabaseError(f"RETURNING column '{returning}' not found in result")
                    return row[returning]
                return cur.rowcount
            except Exception as e:
                raise DatabaseError(f"Execute failed: {e}") from e

    def query_one(
        self,
        sql: str,
        params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """단일 행(dict) 또는 None"""
        with self._cursor() as cur:
            try:
                cur.execute(sql, params or None)
                row = cur.fetchone()
                return dict(row) if row is not None else None
            except Exception as e:
                raise DatabaseError(f"Query one failed: {e}") from e

    def query_all(
        self,
        sql: str,
        params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """여러 행(list[dict])"""
        with self._cursor() as cur:
            try:
                cur.execute(sql, params or None)
                rows = cur.fetchall()
                return [dict(r) for r in rows]
            except Exception as e:
                raise DatabaseError(f"Query all failed: {e}") from e

    # ---------- Convenience ----------

    def exists(self, sql: str, params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None) -> bool:
        return self.query_one(sql, params) is not None

    def scalar(
        self,
        sql: str,
        params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None,
        *,
        column: Optional[str] = None,
    ) -> Any:
        row = self.query_one(sql, params)
        if row is None:
            return None
        if column:
            return row.get(column)
        return next(iter(row.values())) if row else None
