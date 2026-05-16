from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Alert
from .serializers import AlertSerializer
from .services import (
    generate_job_reminder_alerts,
    generate_stock_alerts_for_all_materials,
)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related(
        "material",
        "job",
        "calendar_event",
    ).all()

    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Alert.objects.select_related(
            "material",
            "job",
            "calendar_event",
        ).filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def parse_upcoming_job_days(self, value):
        if value in (None, ""):
            return None

        try:
            days = int(value)
        except (TypeError, ValueError):
            raise ValueError("Los dias de aviso deben ser un numero entero.")

        if days < 1 or days > 365:
            raise ValueError("Los dias de aviso deben estar entre 1 y 365.")

        return days

    @action(detail=True, methods=["post"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=["is_read", "updated_at"])

        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="mark-all-as-read")
    def mark_all_as_read(self, request):
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True)

        return Response(
            {"detail": f"{updated_count} alertas marcadas como leidas."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="generate-stock-alerts")
    def generate_stock_alerts(self, request):
        generated_alerts = generate_stock_alerts_for_all_materials(owner=request.user)
        serializer = self.get_serializer(generated_alerts, many=True)

        return Response(
            {
                "created_count": len(generated_alerts),
                "alerts": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="generate-job-reminders")
    def generate_job_reminders(self, request):
        try:
            upcoming_job_days = self.parse_upcoming_job_days(
                request.data.get("upcoming_job_days")
            )
        except ValueError as error:
            return Response(
                {"upcoming_job_days": [str(error)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        generated_alerts = generate_job_reminder_alerts(
            owner=request.user,
            upcoming_job_days=upcoming_job_days,
        )

        serializer = self.get_serializer(generated_alerts, many=True)

        return Response(
            {
                "created_count": len(generated_alerts),
                "alerts": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )