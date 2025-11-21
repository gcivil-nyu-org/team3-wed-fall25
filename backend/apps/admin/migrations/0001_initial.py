# Generated manually

from django.conf import settings
from django.db import migrations, models, connection
import django.db.models.deletion


def check_table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
            """,
            [table_name],
        )
        return cursor.fetchone()[0]


def create_table_safely(apps, schema_editor):
    """Create table only if it doesn't exist - handles migration history issues"""
    db_table = "admin_activity_logs"

    # If table already exists, skip creation (migration was already applied)
    if check_table_exists(db_table):
        return

    # Use the standard Django migration operations
    # We'll create the model using the standard approach
    from apps.admin.models import AdminActivityLog

    # Create the table using schema_editor
    schema_editor.create_model(AdminActivityLog)


def reverse_create_table(apps, schema_editor):
    """Reverse migration - drop table if it exists"""
    db_table = "admin_activity_logs"
    if check_table_exists(db_table):
        with connection.cursor() as cursor:
            cursor.execute(f'DROP TABLE IF EXISTS "{db_table}" CASCADE;')


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("user", "0001_initial"),  # Explicit dependency on user app
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminActivityLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(primary_key=True, serialize=False),
                ),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("approved_review", "Approved Review"),
                            ("removed_review", "Removed Review"),
                            ("banned_user", "Banned User"),
                            ("unbanned_user", "Unbanned User"),
                            ("resolved_report", "Resolved Report"),
                        ],
                        max_length=50,
                    ),
                ),
                ("target_type", models.CharField(max_length=50)),
                ("target_id", models.BigIntegerField()),
                ("target_description", models.TextField()),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "admin_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="admin_actions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "admin_activity_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(fields=["-created_at"], name="idx_admin_logs_created"),
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(
                fields=["admin_user", "-created_at"],
                name="idx_admin_logs_user",
            ),
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(
                fields=["action", "-created_at"],
                name="idx_admin_logs_action",
            ),
        ),
    ]
