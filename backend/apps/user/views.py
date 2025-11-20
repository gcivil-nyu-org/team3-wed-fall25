from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    EmailVerificationSerializer,
    ResendVerificationSerializer,
)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""

    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": (
                    "Registration successful! "
                    "Please check your email to verify your account."
                ),
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """User login endpoint"""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data["user"]

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            return Response(
                {
                    "message": "Login successful",
                    "access": access_token,
                    "refresh": refresh_token,
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"result": False, "error_message": str(serializer.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ProfileView(APIView):
    """Get and update current user profile"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update user profile"""
        try:
            serializer = UserSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            # Return validation errors in a format that the error middleware will handle
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Handle database integrity errors (e.g., unique constraint violations)
            error_message = str(e)
            if (
                "unique constraint" in error_message.lower()
                or "duplicate key" in error_message.lower()
            ):
                if "username" in error_message.lower():
                    return Response(
                        {"username": ["A user with this username already exists."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            return Response(
                {"detail": f"Error updating profile: {error_message}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Alias for backward compatibility with tests
MeView = ProfileView


class VerifyEmailView(APIView):
    """Email verification endpoint"""

    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)

        if serializer.is_valid():
            token = serializer.validated_data["token"]
            user = CustomUser.objects.get(verification_token=token)
            user.is_verified = True
            user.save()

            return Response(
                {
                    "message": "Email verified successfully! You can now log in.",
                    "verified": True,
                },
                status=status.HTTP_200_OK,
            )

        # Handle already verified case
        if "token" in serializer.errors and "Email is already verified" in str(
            serializer.errors["token"]
        ):
            return Response(
                {
                    "message": "Email is already verified! You can log in.",
                    "verified": True,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """Resend verification email endpoint"""

    permission_classes = [permissions.AllowAny]
    serializer_class = ResendVerificationSerializer

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data["email"]
            user = CustomUser.objects.get(email=email)
            user.resend_verification_email()

            return Response(
                {"message": "Verification email sent! Please check your inbox."},
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsersListView(APIView):
    """Get all users (tenants and landlords) excluding the logged-in user"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Returns all users except the logged-in user.
        Includes:
        - All tenants
        - All landlords (including those associated with buildings)
        """
        try:
            current_user_id = request.user.id

            # Get all users except the current user
            users = (
                CustomUser.objects.exclude(id=current_user_id)
                .filter(is_active=True)
                .order_by("first_name", "last_name", "email")
            )

            # Serialize users
            serializer = UserSerializer(users, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Error fetching users: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
