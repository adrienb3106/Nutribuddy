from django.contrib import admin

from .models import FoodItem, ScanHistory


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "source",
        "kcal_100g",
        "protein_g_100g",
        "carbs_g_100g",
        "fat_g_100g",
        "irritability_level",
        "vegan",
        "vegetarian",
        "pescetarian",
        "gluten_free",
        "lactose_free",
    )
    search_fields = ("name", "barcode", "source_code")
    list_filter = (
        "source",
        "vegan",
        "vegetarian",
        "pescetarian",
        "gluten_free",
        "lactose_free",
        "irritability_level",
    )
    ordering = ("name",)


@admin.register(ScanHistory)
class ScanHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "food_item", "barcode", "scanned_at")
    search_fields = ("user__username", "food_item__name", "barcode")
    list_filter = ("scanned_at",)
    ordering = ("-scanned_at",)
