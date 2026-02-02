from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics, permissions

from .models import UserProfile
from .serializers import UserProfileSerializer, UserRegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def perform_create(self, serializer):
        user = serializer.save()
        UserProfile.objects.get_or_create(user=user)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile