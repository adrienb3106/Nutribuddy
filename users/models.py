from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")

    class Irritability(models.TextChoices):
        HIGH_FODMAP = "high_fodmap", "Riche en FODMAP"
        LOW_FODMAP = "low_fodmap", "Pauvre en FODMAP"

    vegan = models.BooleanField(default=False)
    vegetarian = models.BooleanField(default=False)
    pescetarian = models.BooleanField(default=False)
    gluten_free = models.BooleanField(default=False)
    lactose_free = models.BooleanField(default=False)
    irritability_level = models.CharField(
        max_length=16,
        choices=Irritability.choices,
        null=True,
        blank=True,
    )
    allergens = models.JSONField(default=list, blank=True)
    filter_allergens = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Profile({self.user_id})"
