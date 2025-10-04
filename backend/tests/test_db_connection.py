import pprint

from infrastructures.postgres.postgres_client import PostgresClient


def test_db_connection(client: PostgresClient):
    with client as db:
        user = db.query_one("SELECT * from auth_user")
        pprint.pprint(user)




if __name__ == "__main__":
    test_db_connection(PostgresClient())