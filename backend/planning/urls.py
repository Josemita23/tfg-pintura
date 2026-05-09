from rest_framework.routers import DefaultRouter

from .views import CalendarEventViewSet

router = DefaultRouter()
router.register("", CalendarEventViewSet, basename="planning")

urlpatterns = router.urls