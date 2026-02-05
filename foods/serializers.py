from rest_framework import serializers

from .fodmap import find_fodmap_matches
from .models import FoodItem, ScanHistory


class FoodItemSerializer(serializers.ModelSerializer):
    fodmap_matches = serializers.SerializerMethodField()

    class Meta:
        model = FoodItem
        fields = "__all__"

    def get_fodmap_matches(self, obj: FoodItem) -> list[str]:
        if not obj.irritability_level:
            return []
        source = " ".join(
            value
            for value in [obj.name, obj.ingredients_text_fr, obj.ingredients_text]
            if value
        )
        high_matches, low_matches = find_fodmap_matches(source)
        if obj.irritability_level == FoodItem.Irritability.HIGH_FODMAP:
            return high_matches
        if obj.irritability_level == FoodItem.Irritability.LOW_FODMAP:
            return low_matches
        return []


class ScanHistorySerializer(serializers.ModelSerializer):
    food = serializers.SerializerMethodField()

    class Meta:
        model = ScanHistory
        fields = ("id", "food_item", "barcode", "scanned_at", "food")
        extra_kwargs = {"food_item": {"write_only": True}}

    def get_food(self, obj: ScanHistory) -> dict:
        food = obj.food_item
        return {
            "id": food.id,
            "name": food.name,
            "brand": food.brand,
            "barcode": food.barcode,
        }
