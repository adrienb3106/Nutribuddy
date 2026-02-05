from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FoodItem, ScanHistory
from .serializers import FoodItemSerializer, ScanHistorySerializer
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
        candidates = list(qs.order_by("brand").values_list("brand", flat=True)[:200])
        seen = set()
        results = []
        for brand in candidates:
            normalized = brand.strip()
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            results.append(normalized)
            if len(results) >= 20:
                break
        return Response({"results": results})


class ScanHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = ScanHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ScanHistory.objects.filter(user=self.request.user).select_related("food_item")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
