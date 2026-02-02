from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FoodItemViewSet

router = DefaultRouter()
router.register("foods", FoodItemViewSet, basename="food")

urlpatterns = [
    path("", include(router.urls)),
]