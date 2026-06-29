from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Profile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "full_name")

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "first_name", "last_name", "created_at")


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = Profile
        fields = [
            "id", "email", "first_name", "last_name", "avatar_url",
            "bio", "phone", "location", "linkedin_url", "website_url",
            "job_title", "company", "years_experience", "preferred_roles",
            "skills", "email_notifications_enabled", "theme_preference",
            "current_role", "target_roles", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "email", "created_at", "updated_at", "avatar_url"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


class AvatarUploadSerializer(serializers.Serializer):
    cloudinary_url = serializers.URLField()
    cloudinary_public_id = serializers.CharField(max_length=255)


class MeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "first_name", "last_name", "created_at", "profile")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            "current_role", "years_experience", "target_roles", "location", "bio",
            "phone", "linkedin_url", "website_url", "job_title", "company",
            "preferred_roles", "skills", "email_notifications_enabled", "theme_preference"
        )
