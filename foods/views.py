from rest_framework import viewsets

from .models import FoodItem
from .serializers import FoodItemSerializer


class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all().order_by("id")
    serializer_class = FoodItemSerializer