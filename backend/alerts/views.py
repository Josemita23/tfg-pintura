from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from materials.models import Material

from .models import Alert
from .serializers import AlertSerializer


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related("material", "job", "calendar_event").all()
    serializer_class = AlertSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=["post"], url_path="mark-as-read")
    def mark_as_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=["is_read", "updated_at"])

        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="mark-all-as-read")
    def mark_all_as_read(self, request):
        updated_count = Alert.objects.filter(is_read=False).update(is_read=True)

        return Response(
            {"detail": f"{updated_count} alertas marcadas como leídas."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="generate-stock-alerts")
    def generate_stock_alerts(self, request):
        materials = Material.objects.filter(
            status__in=[
                Material.Status.LOW_STOCK,
                Material.Status.OUT_OF_STOCK,
            ]
        )

        created_alerts = []

        for material in materials:
            existing_alert = Alert.objects.filter(
                material=material,
                alert_type__in=[
                    Alert.AlertType.LOW_STOCK,
                    Alert.AlertType.OUT_OF_STOCK,
                ],
                is_read=False,
            ).exists()

            if existing_alert:
                continue

            if material.status == Material.Status.OUT_OF_STOCK:
                alert_type = Alert.AlertType.OUT_OF_STOCK
                priority = Alert.Priority.HIGH
                title = f"Material agotado: {material.name}"
                description = (
                    f"El material {material.name} no tiene stock disponible. "
                    f"Cantidad actual: {material.quantity_available} {material.unit}."
                )
            else:
                alert_type = Alert.AlertType.LOW_STOCK
                priority = Alert.Priority.MEDIUM
                title = f"Stock bajo: {material.name}"
                description = (
                    f"El material {material.name} está por debajo del stock mínimo. "
                    f"Cantidad actual: {material.quantity_available} {material.unit}. "
                    f"Stock mínimo: {material.minimum_stock} {material.unit}."
                )

            alert = Alert.objects.create(
                alert_type=alert_type,
                title=title,
                description=description,
                priority=priority,
                material=material,
            )

            created_alerts.append(alert)

        serializer = self.get_serializer(created_alerts, many=True)

        return Response(
            {
                "created_count": len(created_alerts),
                "alerts": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )