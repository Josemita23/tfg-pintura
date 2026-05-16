from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from jobs.models import Job
from jobs.serializers import JobSerializer

from .models import Budget, BudgetItem
from .serializers import BudgetItemSerializer, BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("client").prefetch_related("items").all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.select_related("client").prefetch_related("items").filter(
            owner=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"], url_path="convert-to-job")
    def convert_to_job(self, request, pk=None):
        budget = self.get_object()

        if budget.status == Budget.Status.CONVERTED:
            return Response(
                {"detail": "Este presupuesto ya ha sido convertido en trabajo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if budget.status != Budget.Status.ACCEPTED:
            return Response(
                {"detail": "Solo se pueden convertir presupuestos aceptados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(budget, "job"):
            return Response(
                {"detail": "Ya existe un trabajo asociado a este presupuesto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = Job.objects.create(
            owner=budget.owner,
            client=budget.client,
            budget=budget,
            title=request.data.get("title", f"Trabajo asociado a {budget.code}"),
            description=budget.description,
            address=budget.client.address,
            status=Job.Status.PENDING,
            notes=budget.notes,
        )

        budget.status = Budget.Status.CONVERTED
        budget.save(update_fields=["status", "updated_at"])

        serializer = JobSerializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BudgetItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetItem.objects.select_related("budget", "budget__client").all()
    serializer_class = BudgetItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BudgetItem.objects.select_related("budget", "budget__client").filter(
            budget__owner=self.request.user
        )
