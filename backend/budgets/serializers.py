from rest_framework import serializers

from .models import Budget, BudgetBasePrice, BudgetItem


class BudgetBasePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetBasePrice
        fields = [
            "id",
            "name",
            "description",
            "unit",
            "unit_price",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio de referencia no puede ser negativo.")

        return value


class BudgetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = [
            "id",
            "budget",
            "description",
            "quantity",
            "unit",
            "unit_price",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "amount", "created_at", "updated_at"]

    def validate_budget(self, value):
        request = self.context.get("request")

        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("No puedes usar un presupuesto de otro usuario.")

        return value


class BudgetSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.__str__", read_only=True)
    items = BudgetItemSerializer(many=True, read_only=True)

    class Meta:
        model = Budget
        fields = [
            "id",
            "client",
            "client_name",
            "code",
            "description",
            "date",
            "status",
            "subtotal",
            "vat_percentage",
            "vat_amount",
            "total",
            "notes",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "vat_amount",
            "total",
            "created_at",
            "updated_at",
        ]

    def validate_client(self, value):
        request = self.context.get("request")

        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("No puedes usar un cliente de otro usuario.")

        return value
