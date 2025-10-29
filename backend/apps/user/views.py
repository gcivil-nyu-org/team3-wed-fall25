from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError

from .models import CustomUser
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    UserSerializer,
    EmailVerificationSerializer,
    ResendVerificationSerializer
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
        
        return Response({
            'message': 'Registration successful! Please check your email to verify your account.',
            'user_id': user.id,
            'email': user.email
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            return Response({
                'message': 'Login successful',
                'access': access_token,
                'refresh': refresh_token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'result': False,
            'error_message': str(serializer.errors)
        }, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """Get current user profile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class VerifyEmailView(APIView):
    """Email verification endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        
        if serializer.is_valid():
            token = serializer.validated_data['token']
            user = CustomUser.objects.get(verification_token=token)
            user.is_verified = True
            user.save()
            
            return Response({
                'message': 'Email verified successfully! You can now log in.',
                'verified': True
            }, status=status.HTTP_200_OK)
        
        # Handle already verified case
        if 'token' in serializer.errors and 'Email is already verified' in str(serializer.errors['token']):
            return Response({
                'message': 'Email is already verified! You can log in.',
                'verified': True
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """Resend verification email endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = CustomUser.objects.get(email=email)
            user.resend_verification_email()
            
            return Response({
                'message': 'Verification email sent! Please check your inbox.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)