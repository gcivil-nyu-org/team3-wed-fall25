from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=12)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = (
            "username",
            "email",
            "password",
            "confirm_password",
            "role",
            "tenant_type",
            "phone_number",
            "landlord_type",
            "organization_name",
            "hpd_registration_number",
            "business_phone",
            "first_name",
            "last_name",
        )
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        """Validate password confirmation and role-specific fields"""
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("Passwords don't match")

        # Validate role-specific fields
        role = attrs.get("role")

        if role == "tenant":
            if not attrs.get("tenant_type"):
                raise serializers.ValidationError("Tenant type is required")
        elif role == "landlord":
            if not attrs.get("landlord_type"):
                raise serializers.ValidationError("Landlord type is required")

            # Organization name required for certain landlord types
            landlord_type = attrs.get("landlord_type")
            if landlord_type in ["property_management", "corporate_landlord"]:
                if not attrs.get("organization_name"):
                    raise serializers.ValidationError(
                        "Organization name is required for this landlord type"
                    )

        return attrs

    def create(self, validated_data):
        """Create user and send verification email"""
        # Remove confirm_password from validated_data
        validated_data.pop("confirm_password")

        # Create user
        user = CustomUser.objects.create_user(**validated_data)

        # Send verification email
        user.send_verification_email()

        return user


class LoginSerializer(serializers.Serializer):
    # Changed to CharField to accept username or email
    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True)

    def validate(self, attrs):
        email_or_username = attrs.get("email")
        password = attrs.get("password")

        if not email_or_username:
            raise serializers.ValidationError({"email": "This field is required."})
        if not password:
            raise serializers.ValidationError({"password": "This field is required."})

        # Authenticate using email or username (EmailBackend supports both)
        user = authenticate(username=email_or_username, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_verified:
            raise serializers.ValidationError(
                "Please verify your email before logging in.", code="email_not_verified"
            )

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    tenant_type_display = serializers.CharField(
        source="get_tenant_type_display", read_only=True
    )
    landlord_type_display = serializers.CharField(
        source="get_landlord_type_display", read_only=True
    )

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "is_verified",
            "tenant_type",
            "tenant_type_display",
            "phone_number",
            "landlord_type",
            "landlord_type_display",
            "organization_name",
            "hpd_registration_number",
            "business_phone",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "is_verified",
            "email",
            "role",
        )

    def validate_tenant_type(self, value):
        """Validate tenant_type only if user is a tenant"""
        if value and self.instance and self.instance.role != "tenant":
            raise serializers.ValidationError(
                "Tenant type can only be set for tenant users."
            )
        return value

    def update(self, instance, validated_data):
        """Update user instance"""
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save the instance
        # The model's clean() method is now lenient for updates (allows partial updates)
        instance.save()
        return instance


# Alias for backward compatibility with tests
MeSerializer = UserSerializer


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate_token(self, value):
        """Validate that the token exists and user is not already verified"""
        try:
            user = CustomUser.objects.get(verification_token=value)
            if user.is_verified:
                raise serializers.ValidationError("Email is already verified")
            return value
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token")


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        """Validate that the email exists and is not verified"""
        try:
            user = CustomUser.objects.get(email=value)
            if user.is_verified:
                raise serializers.ValidationError("Email is already verified")
            return value
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("No account found with this email")
