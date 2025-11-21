# Generated migration to activate admin user
from django.db import migrations
from django.contrib.auth import get_user_model


def activate_admin_user(apps, schema_editor):
    """Activate the admin user if it exists"""
    User = get_user_model()
    try:
        admin_user = User.objects.get(username="admin")
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.is_verified = True
        admin_user.save(
            update_fields=["is_active", "is_staff", "is_superuser", "is_verified"]
        )
    except User.DoesNotExist:
        # Admin user doesn't exist yet, will be created by management command
        pass


def reverse_activate_admin_user(apps, schema_editor):
    """Reverse migration - deactivate admin user"""
    User = get_user_model()
    try:
        admin_user = User.objects.get(username="admin")
        admin_user.is_active = False
        admin_user.save(update_fields=["is_active"])
    except User.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("admin_dashboard", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(activate_admin_user, reverse_activate_admin_user),
    ]
