"""
Django management command to create or update admin user
Ensures admin user exists with username: admin, password: test1234
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update admin user (username: admin, password: test1234)"

    def handle(self, *args, **options):
        username = "admin"
        password = "test1234"
        email = "admin@housingtransparency.com"

        try:
            with transaction.atomic():
                # Try to get existing user by username or email
                user = None
                try:
                    user = User.objects.get(username=username)
                    self.stdout.write(f"Found existing user with username: {username}")
                except User.DoesNotExist:
                    try:
                        user = User.objects.get(email=email)
                        self.stdout.write(f"Found existing user with email: {email}")
                    except User.DoesNotExist:
                        pass

                if user:
                    # Update existing user
                    self.stdout.write(f"Updating existing user: {user.username}")
                    user.email = email
                    user.first_name = "Admin"
                    user.last_name = "User"
                    user.role = "tenant"
                    user.is_verified = True
                    user.is_staff = True
                    user.is_superuser = True
                    user.is_active = True
                    user.set_password(password)
                    user.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Updated admin user: {username} (is_active={user.is_active}, is_staff={user.is_staff}, is_superuser={user.is_superuser})"
                        )
                    )
                else:
                    # Create new user
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        first_name="Admin",
                        last_name="User",
                        role="tenant",
                        is_verified=True,
                        is_staff=True,
                        is_superuser=True,
                        is_active=True,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Created admin user: {username} (is_active={user.is_active}, is_staff={user.is_staff}, is_superuser={user.is_superuser})"
                        )
                    )

                # Verify the user was created/updated correctly
                user.refresh_from_db()
                if not user.is_active:
                    self.stdout.write(
                        self.style.ERROR(
                            f"WARNING: User {username} is not active after save!"
                        )
                    )
                if not user.check_password(password):
                    self.stdout.write(
                        self.style.ERROR(
                            f"WARNING: Password verification failed for {username}!"
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error creating/updating admin user: {str(e)}")
            )
            raise
