from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "vegan",
        "vegetarian",
        "pescetarian",
        "gluten_free",
        "lactose_free",
        "irritability_level",
    )
    search_fields = ("user__username", "user__email")
    list_filter = (
        "vegan",
        "vegetarian",
        "pescetarian",
        "gluten_free",
        "lactose_free",
        "irritability_level",
    )