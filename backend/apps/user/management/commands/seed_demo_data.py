"""
Django management command to seed demo data for class presentation
Creates test users, favorites, reviews, and messages
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection
from datetime import datetime, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Seed database with demo data (users, favorites, reviews, messages)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting to seed demo data..."))

        # Sample BBLs from NYC (real building identifiers)
        sample_bbls = [
            "1000010001",  # Manhattan
            "2000020002",  # Brooklyn
            "3000030003",  # Queens
            "4000040004",  # Bronx
            "5000050005",  # Staten Island
        ]

        # Create test users
        users = []
        user_data = [
            {
                "username": "alice_tenant",
                "email": "alice@demo.com",
                "password": "demo12345",
                "first_name": "Alice",
                "last_name": "Smith",
                "role": "tenant",
                "tenant_type": "student",
            },
            {
                "username": "bob_tenant",
                "email": "bob@demo.com",
                "password": "demo12345",
                "first_name": "Bob",
                "last_name": "Johnson",
                "role": "tenant",
                "tenant_type": "working_professional",
            },
            {
                "username": "charlie_landlord",
                "email": "charlie@demo.com",
                "password": "demo12345",
                "first_name": "Charlie",
                "last_name": "Brown",
                "role": "landlord",
                "landlord_type": "individual_owner",
            },
        ]

        for data in user_data:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    "username": data["username"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "role": data["role"],
                    "is_verified": True,  # Auto-verify for demo
                },
            )
            if created:
                user.set_password(data["password"])
                if data["role"] == "tenant":
                    user.tenant_type = data["tenant_type"]
                else:
                    user.landlord_type = data["landlord_type"]
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Created user: {data['email']}")
                )
            else:
                # Update password in case it changed
                user.set_password(data["password"])
                user.save()
                self.stdout.write(
                    self.style.WARNING(f"→ User already exists: {data['email']}")
                )
            users.append(user)

        alice, bob, charlie = users[0], users[1], users[2]

        # Create favorites for Alice and Bob
        self.stdout.write(self.style.SUCCESS("\nCreating favorites..."))
        with connection.cursor() as cursor:
            # Alice's favorites
            for i, bbl in enumerate(sample_bbls[:3]):
                cursor.execute(
                    """
                    INSERT INTO community_favorites (user_id, bbl, note, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        alice.id,
                        bbl,
                        (
                            f"Great building #{i+1} with good amenities"
                            if i == 0
                            else None
                        ),
                        datetime.now() - timedelta(days=10 - i),
                        datetime.now() - timedelta(days=10 - i),
                    ],
                )

            # Bob's favorites
            for i, bbl in enumerate(sample_bbls[1:4]):
                cursor.execute(
                    """
                    INSERT INTO community_favorites (user_id, bbl, note, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        bob.id,
                        bbl,
                        None,
                        datetime.now() - timedelta(days=7 - i),
                        datetime.now() - timedelta(days=7 - i),
                    ],
                )

        self.stdout.write(self.style.SUCCESS("✓ Created favorites"))

        # Create reviews for buildings in favorites
        self.stdout.write(self.style.SUCCESS("\nCreating reviews..."))
        reviews_data = [
            {
                "user_id": alice.id,
                "bbl": sample_bbls[0],
                "rating": 5.0,
                "title": "Excellent Building!",
                "body": (
                    "This building has excellent maintenance and responsive "
                    "management. The super is always available and fixes "
                    "issues quickly. Highly recommend!"
                ),
            },
            {
                "user_id": alice.id,
                "bbl": sample_bbls[1],
                "rating": 4.0,
                "title": "Good Location",
                "body": (
                    "The location is convenient, close to public transport "
                    "and shops. The building is well-maintained, though the "
                    "heating could be better in winter."
                ),
            },
            {
                "user_id": bob.id,
                "bbl": sample_bbls[1],
                "rating": 3.5,
                "title": "Average Experience",
                "body": (
                    "The building is okay, but there have been some "
                    "maintenance delays. The location is good though."
                ),
            },
            {
                "user_id": bob.id,
                "bbl": sample_bbls[2],
                "rating": 4.5,
                "title": "Great Value",
                "body": (
                    "Good value for money. The apartment is spacious and "
                    "the neighborhood is safe. Management is responsive."
                ),
            },
        ]

        with connection.cursor() as cursor:
            for review in reviews_data:
                cursor.execute(
                    """
                    INSERT INTO community_reviews (user_id, bbl, rating, title, body, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        review["user_id"],
                        review["bbl"],
                        review["rating"],
                        review["title"],
                        review["body"],
                        datetime.now() - timedelta(days=random.randint(1, 30)),
                        datetime.now() - timedelta(days=random.randint(1, 30)),
                    ],
                )

        self.stdout.write(self.style.SUCCESS("✓ Created reviews"))

        # Create messages between users
        self.stdout.write(self.style.SUCCESS("\nCreating messages..."))
        messages_data = [
            {
                "sender_id": alice.id,
                "receiver_id": charlie.id,
                "bbl": sample_bbls[0],
                "body": (
                    "Hi, I'm interested in learning more about the building "
                    "maintenance schedule. Can you provide details?"
                ),
            },
            {
                "sender_id": charlie.id,
                "receiver_id": alice.id,
                "bbl": sample_bbls[0],
                "body": (
                    "Hello Alice! I'd be happy to help. The building has "
                    "regular maintenance every month. What specific "
                    "information are you looking for?"
                ),
                "read_at": datetime.now() - timedelta(hours=2),
            },
            {
                "sender_id": alice.id,
                "receiver_id": charlie.id,
                "bbl": sample_bbls[0],
                "body": (
                    "Thanks! I'm particularly interested in HVAC maintenance "
                    "and pest control schedules."
                ),
            },
            {
                "sender_id": bob.id,
                "receiver_id": alice.id,
                "bbl": None,
                "body": (
                    "Hey Alice, I saw your review about building 2000020002. "
                    "I live there too! Would love to connect."
                ),
            },
            {
                "sender_id": alice.id,
                "receiver_id": bob.id,
                "bbl": None,
                "body": "Hi Bob! Nice to meet a neighbor. How long have you been living there?",
                "read_at": datetime.now() - timedelta(hours=1),
            },
        ]

        with connection.cursor() as cursor:
            for i, msg in enumerate(messages_data):
                created_at = datetime.now() - timedelta(days=2 - i, hours=12 - i * 2)
                cursor.execute(
                    """
                    INSERT INTO community_messages (sender_id, receiver_id, bbl, body, read_at, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        msg["sender_id"],
                        msg["receiver_id"],
                        msg.get("bbl"),
                        msg["body"],
                        msg.get("read_at"),
                        created_at,
                        created_at,
                    ],
                )

        self.stdout.write(self.style.SUCCESS("✓ Created messages"))

        # Print credentials
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("DEMO CREDENTIALS FOR CLASS PRESENTATION"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("User 1 - Alice (Tenant):"))
        self.stdout.write("  Email: alice@demo.com")
        self.stdout.write("  Password: demo12345")
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("User 2 - Bob (Tenant):"))
        self.stdout.write("  Email: bob@demo.com")
        self.stdout.write("  Password: demo12345")
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("User 3 - Charlie (Landlord):"))
        self.stdout.write("  Email: charlie@demo.com")
        self.stdout.write("  Password: demo12345")
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("Data Summary:"))
        self.stdout.write("  - Alice has 3 favorites with 2 reviews")
        self.stdout.write("  - Bob has 3 favorites with 2 reviews")
        self.stdout.write("  - 5 messages between users (Alice ↔ Charlie, Alice ↔ Bob)")
        self.stdout.write("\n")
        self.stdout.write(
            self.style.SUCCESS("✓ Demo data seeding completed successfully!")
        )
