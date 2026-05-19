from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "email",
            "address",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "full_name", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return str(obj)

    def validate_phone(self, value):
        normalized_phone = value.replace(" ", "")

        if not normalized_phone.isdigit() or len(normalized_phone) != 9:
            raise serializers.ValidationError(
                "Introduce un telefono de 9 digitos."
            )

        queryset = Client.objects.filter(phone=normalized_phone)
        request = self.context.get("request")

        if request:
            queryset = queryset.filter(owner=request.user)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("Ya existe un cliente con ese telefono.")

        return normalized_phone
