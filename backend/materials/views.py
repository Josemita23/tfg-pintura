from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from alerts.services import sync_stock_alert_for_material

from .models import Material, MaterialConsumption
from .serializers import MaterialConsumptionSerializer, MaterialSerializer


def format_django_validation_error(error):
    return error.message_dict if hasattr(error, "message_dict") else error.messages


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Material.objects.filter(owner=self.request.user)
        search = self.request.query_params.get("search", "").strip()
        selected_status = self.request.query_params.get("status", "").strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(material_type__icontains=search)
                | Q(provider__icontains=search)
                | Q(status__icontains=search)
            )

        if selected_status and selected_status != "ALL":
            queryset = queryset.filter(status=selected_status)

        return queryset

    def perform_create(self, serializer):
        material = serializer.save(owner=self.request.user)
        sync_stock_alert_for_material(material)

    def perform_update(self, serializer):
        material = serializer.save()
        sync_stock_alert_for_material(material)


class MaterialConsumptionViewSet(viewsets.ModelViewSet):
    queryset = MaterialConsumption.objects.select_related("job", "material").all()
    serializer_class = MaterialConsumptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MaterialConsumption.objects.select_related("job", "material").filter(
            job__owner=self.request.user,
            material__owner=self.request.user,
        )

    def perform_create(self, serializer):
        try:
            consumption = serializer.save()
            sync_stock_alert_for_material(consumption.material)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_update(self, serializer):
        try:
            previous_consumption = self.get_object()
            previous_material = previous_consumption.material

            consumption = serializer.save()

            sync_stock_alert_for_material(previous_material)
            sync_stock_alert_for_material(consumption.material)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_destroy(self, instance):
        material = instance.material
        instance.delete()
        sync_stock_alert_for_material(material)
