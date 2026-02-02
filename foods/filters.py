from django_filters import rest_framework as filters

from .models import FoodItem


class FoodItemFilter(filters.FilterSet):
    kcal_min = filters.NumberFilter(field_name="kcal_100g", lookup_expr="gte")
    kcal_max = filters.NumberFilter(field_name="kcal_100g", lookup_expr="lte")

    protein_min = filters.NumberFilter(field_name="protein_g_100g", lookup_expr="gte")
    protein_max = filters.NumberFilter(field_name="protein_g_100g", lookup_expr="lte")

    carbs_min = filters.NumberFilter(field_name="carbs_g_100g", lookup_expr="gte")
    carbs_max = filters.NumberFilter(field_name="carbs_g_100g", lookup_expr="lte")

    fat_min = filters.NumberFilter(field_name="fat_g_100g", lookup_expr="gte")
    fat_max = filters.NumberFilter(field_name="fat_g_100g", lookup_expr="lte")

    irritability_min = filters.NumberFilter(field_name="irritability_level", lookup_expr="gte")
    irritability_max = filters.NumberFilter(field_name="irritability_level", lookup_expr="lte")

    class Meta:
        model = FoodItem
        fields = [
            "food_type",
            "vegan",
            "vegetarian",
            "pescetarian",
            "gluten_free",
            "lactose_free",
            "irritability_level",
        ]
