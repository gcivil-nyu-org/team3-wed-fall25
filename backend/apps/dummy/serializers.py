# backend/apps/dummy/serializers.py
from rest_framework import serializers

class DummyItemCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    detail = serializers.CharField(allow_blank=True, required=False)

class DummyItemUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    detail = serializers.CharField(allow_blank=True, required=False)

class DummyItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    detail = serializers.CharField(allow_blank=True, required=False)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
