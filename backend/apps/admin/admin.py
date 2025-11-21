from django.contrib import admin
from .models import AdminActivityLog


@admin.register(AdminActivityLog)
class AdminActivityLogAdmin(admin.ModelAdmin):
    list_display = ["id", "action", "admin_user", "target_type", "target_id", "created_at"]
    list_filter = ["action", "target_type", "created_at"]
    search_fields = ["target_description", "admin_user__email", "admin_user__username"]
    readonly_fields = ["created_at"]
