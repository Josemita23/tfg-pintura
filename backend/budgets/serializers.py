from rest_framework import serializers

from .models import Budget, BudgetItem


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