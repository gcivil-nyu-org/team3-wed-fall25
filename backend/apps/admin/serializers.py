from rest_framework import serializers
from .models import AdminActivityLog


class AdminActivityLogSerializer(serializers.ModelSerializer):
    admin = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    action = serializers.SerializerMethodField()

    class Meta:
        model = AdminActivityLog
        fields = ["id", "action", "admin", "target", "timestamp", "details"]

    def get_admin(self, obj):
        if obj.admin_user:
            return obj.admin_user.email or obj.admin_user.username
        return "System"

    def get_target(self, obj):
        return obj.target_description

    def get_action(self, obj):
        return obj.get_action_display()
