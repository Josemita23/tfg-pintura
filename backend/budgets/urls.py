from rest_framework.routers import DefaultRouter

from .views import BudgetItemViewSet, BudgetViewSet

router = DefaultRouter()
router.register("items", BudgetItemViewSet, basename="budget-items")
router.register("", BudgetViewSet, basename="budgets")

urlpatterns = router.urls