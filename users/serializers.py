from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = get_user_model()
        fields = ("id", "username", "email", "password")

    def create(self, validated_data):
        user_model = get_user_model()
        return user_model.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "vegan",
            "vegetarian",
            "pescetarian",
            "gluten_free",
            "lactose_free",
            "irritability_level",
            "allergens",
            "filter_allergens",
        )
