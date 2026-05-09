from rest_framework import serializers

from .models import Material, MaterialConsumption


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = [
            "id",
            "name",
            "material_type",
            "provider",
            "quantity_available",
            "minimum_stock",
            "unit",
            "unit_price",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate_quantity_available(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad disponible no puede ser negativa.")
        return value

    def validate_minimum_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock mínimo no puede ser negativo.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio unitario no puede ser negativo.")
        return value


class MaterialConsumptionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    job_title = serializers.CharField(source="job.title", read_only=True)

    class Meta:
        model = MaterialConsumption
        fields = [
            "id",
            "job",
            "job_title",
            "material",
            "material_name",
            "quantity",
            "consumption_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "job_title", "material_name", "created_at", "updated_at"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad consumida debe ser mayor que cero.")
        return value