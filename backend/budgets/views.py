from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Budget, BudgetItem
from .serializers import BudgetItemSerializer, BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("client").prefetch_related("items").all()
    serializer_class = BudgetSerializer
    permission_classes = [AllowAny]


class BudgetItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetItem.objects.select_related("budget", "budget__client").all()
    serializer_class = BudgetItemSerializer
    permission_classes = [AllowAny]