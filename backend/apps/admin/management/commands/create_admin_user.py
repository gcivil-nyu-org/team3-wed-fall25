"""
Django management command to create or update admin user
Ensures admin user exists with username: admin, password: test1234
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update admin user (username: admin, password: test1234)"

    def handle(self, *args, **options):
        username = "admin"
        password = "test1234"
        email = "admin@housingtransparency.com"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": "Admin",
                "last_name": "User",
                "role": "tenant",  # Role doesn't matter for admin dashboard access
                "is_verified": True,
                "is_staff": True,
                "is_active": True,
            },
        )

        # Always update password and ensure user is active
        user.set_password(password)
        user.is_verified = True
        user.is_staff = True
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created admin user: {username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✓ Updated admin user: {username}"))
