from rest_framework.routers import DefaultRouter

from .views import MaterialConsumptionViewSet, MaterialViewSet

router = DefaultRouter()
router.register("consumptions", MaterialConsumptionViewSet, basename="material-consumptions")
router.register("", MaterialViewSet, basename="materials")

urlpatterns = router.urls