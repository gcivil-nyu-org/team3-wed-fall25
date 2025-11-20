# Generated migration for AdminActivityLog model
# Run: python manage.py migrate admin

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminActivityLog",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
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
                fields=["admin_user", "-created_at"], name="idx_admin_logs_user"
            ),
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(
                fields=["action", "-created_at"], name="idx_admin_logs_action"
            ),
        ),
    ]
