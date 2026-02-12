from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FoodItemViewSet, ScanHistoryViewSet

router = DefaultRouter()
router.register("foods", FoodItemViewSet, basename="food")
router.register("scan-history", ScanHistoryViewSet, basename="scan-history")

urlpatterns = [
    path("", include(router.urls)),
]
