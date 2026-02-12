from django_filters import rest_framework as filters

from .models import FoodItem
from .allergens import ALLERGEN_RULES, allergen_query


class FoodItemFilter(filters.FilterSet):
    kcal_min = filters.NumberFilter(field_name="kcal_100g", lookup_expr="gte")
    kcal_max = filters.NumberFilter(field_name="kcal_100g", lookup_expr="lte")

    protein_min = filters.NumberFilter(field_name="protein_g_100g", lookup_expr="gte")
    protein_max = filters.NumberFilter(field_name="protein_g_100g", lookup_expr="lte")

    carbs_min = filters.NumberFilter(field_name="carbs_g_100g", lookup_expr="gte")
    carbs_max = filters.NumberFilter(field_name="carbs_g_100g", lookup_expr="lte")

    fat_min = filters.NumberFilter(field_name="fat_g_100g", lookup_expr="gte")
    fat_max = filters.NumberFilter(field_name="fat_g_100g", lookup_expr="lte")

    irritability_level = filters.ChoiceFilter(choices=FoodItem.Irritability.choices)
    brand = filters.CharFilter(field_name="brand", lookup_expr="istartswith")
    barcode = filters.CharFilter(field_name="barcode", lookup_expr="exact")
    allergens = filters.CharFilter(method="filter_allergens")

    class Meta:
        model = FoodItem
        fields = [
            "source",
            "brand",
            "barcode",
            "vegan",
            "vegetarian",
            "pescetarian",
            "gluten_free",
            "lactose_free",
            "irritability_level",
        ]

    def filter_allergens(self, queryset, name, value):
        allergens = [part.strip().lower() for part in value.split(",") if part.strip()]
        if not allergens:
            return queryset

        exclude_flag = str(self.data.get("exclude_allergens", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        if not exclude_flag:
            return queryset

        combined = None
        for key in allergens:
            rule = ALLERGEN_RULES.get(key)
            if not rule:
                continue
            condition = allergen_query(rule)
            combined = condition if combined is None else combined | condition

        if combined is None:
            return queryset

        return queryset.exclude(combined)
