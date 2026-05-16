from rest_framework.routers import DefaultRouter

from .views import BudgetBasePriceViewSet, BudgetItemViewSet, BudgetViewSet

router = DefaultRouter()
router.register("base-prices", BudgetBasePriceViewSet, basename="budget-base-prices")
router.register("items", BudgetItemViewSet, basename="budget-items")
router.register("", BudgetViewSet, basename="budgets")

urlpatterns = router.urls
