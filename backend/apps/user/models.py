from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.mail import send_mail
from django.conf import settings
import uuid


class CustomUser(AbstractUser):
    """
    Custom User model that extends Django's AbstractUser
    to support both tenant and landlord roles with specific fields
    """

    # Role choices
    ROLE_CHOICES = [
        ("tenant", "Tenant"),
        ("landlord", "Landlord"),
    ]

    # Tenant type choices
    TENANT_TYPE_CHOICES = [
        ("student", "Student"),
        ("working_professional", "Working Professional"),
        ("other", "Other"),
    ]

    # Landlord type choices
    LANDLORD_TYPE_CHOICES = [
        ("individual_owner", "Individual Owner"),
        ("property_management", "Property Management Company"),
        ("real_estate_agent", "Real Estate Agent"),
        ("corporate_landlord", "Corporate Landlord"),
    ]

    # Basic fields
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_verified = models.BooleanField(default=False)
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)

    # Tenant-specific fields
    tenant_type = models.CharField(
        max_length=20, choices=TENANT_TYPE_CHOICES, blank=True, null=True
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # Landlord-specific fields
    landlord_type = models.CharField(
        max_length=30, choices=LANDLORD_TYPE_CHOICES, blank=True, null=True
    )
    organization_name = models.CharField(max_length=200, blank=True, null=True)
    hpd_registration_number = models.CharField(max_length=50, blank=True, null=True)
    business_phone = models.CharField(max_length=20, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use email as username
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "role"]

    class Meta:
        db_table = "custom_user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    def clean(self):
        """Validate that role-specific fields are filled based on role"""
        from django.core.exceptions import ValidationError

        # Only validate if this is a new instance (no pk) or if we're
        # explicitly setting role-specific fields
        # This allows partial updates (e.g., updating username) without
        # requiring tenant_type to be re-sent
        if self.role == "tenant" and not self.tenant_type:
            # Check if this is an existing user with tenant_type already set
            if self.pk:
                # For existing users, check if tenant_type is already in the database
                try:
                    existing_user = CustomUser.objects.get(pk=self.pk)
                    if existing_user.tenant_type:
                        # User already has tenant_type, allow update without it
                        return
                except CustomUser.DoesNotExist:
                    pass
            raise ValidationError("Tenant type is required for tenant users")

        if self.role == "landlord" and not self.landlord_type:
            # Check if this is an existing user with landlord_type already set
            if self.pk:
                try:
                    existing_user = CustomUser.objects.get(pk=self.pk)
                    if existing_user.landlord_type:
                        # User already has landlord_type, allow update without it
                        return
                except CustomUser.DoesNotExist:
                    pass
            raise ValidationError("Landlord type is required for landlord users")

        # Organization name required for certain landlord types
        if (
            self.role == "landlord"
            and self.landlord_type in ["property_management", "corporate_landlord"]
            and not self.organization_name
        ):
            # Check if this is an existing user with organization_name already set
            if self.pk:
                try:
                    existing_user = CustomUser.objects.get(pk=self.pk)
                    if existing_user.organization_name:
                        # User already has organization_name, allow update without it
                        return
                except CustomUser.DoesNotExist:
                    pass
            raise ValidationError(
                "Organization name is required for this landlord type"
            )

    def send_verification_email(self):
        """Send email verification to user"""
        verification_url = (
            f"{settings.FRONTEND_URL}/verify-email?token={self.verification_token}"
        )

        subject = "Verify Your Email - Housing Transparency"
        message = f"""
        Hello {self.first_name or self.username},

        Thank you for registering with Housing Transparency!

        Please click the link below to verify your email address:
        {verification_url}

        If you didn't create an account, please ignore this email.

        Best regards,
        Housing Transparency Team
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.email],
            fail_silently=False,
        )

    def resend_verification_email(self):
        """Resend verification email with new token"""
        self.verification_token = uuid.uuid4()
        self.save()
        self.send_verification_email()

    @property
    def display_name(self):
        """Get display name for the user"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username

    @property
    def is_tenant(self):
        """Check if user is a tenant"""
        return self.role == "tenant"

    @property
    def is_landlord(self):
        """Check if user is a landlord"""
        return self.role == "landlord"
