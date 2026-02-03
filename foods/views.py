from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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

    @action(detail=False, methods=["get"], url_path="brands")
    def brands(self, request):
        query = (request.query_params.get("q") or "").strip()
        qs = FoodItem.objects.exclude(brand__isnull=True).exclude(brand__exact="")
        if query:
            qs = qs.filter(brand__istartswith=query)
        brands = list(qs.order_by("brand").values_list("brand", flat=True).distinct()[:20])
        return Response({"results": brands})
