from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import viewsets

from .models import FoodItem
from .serializers import FoodItemSerializer
from .filters import FoodItemFilter


class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all().order_by("id")
    serializer_class = FoodItemSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = FoodItemFilter
    search_fields = ["name", "barcode", "source_code"]
    ordering_fields = ["id", "name", "kcal_100g", "protein_g_100g", "carbs_g_100g", "fat_g_100g"]
    ordering = ["id"]
