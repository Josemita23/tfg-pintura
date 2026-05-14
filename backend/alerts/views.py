from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Alert
from .serializers import AlertSerializer
from .services import generate_stock_alerts_for_all_materials


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related(
        "material",
        "job",
        "calendar_event",
    ).all()
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
        generated_alerts = generate_stock_alerts_for_all_materials()

        serializer = self.get_serializer(generated_alerts, many=True)

        return Response(
            {
                "created_count": len(generated_alerts),
                "alerts": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )