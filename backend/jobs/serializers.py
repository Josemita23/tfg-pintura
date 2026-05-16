from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    budget_code = serializers.CharField(source="budget.code", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "client",
            "client_name",
            "budget",
            "budget_code",
            "title",
            "description",
            "address",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "client_name", "budget_code", "created_at", "updated_at"]

    def get_client_name(self, obj):
        return str(obj.client)

    def validate_client(self, value):
        request = self.context.get("request")

        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("No puedes usar un cliente de otro usuario.")

        return value

    def validate_budget(self, value):
        request = self.context.get("request")

        if value and request and value.owner_id != request.user.id:
            raise serializers.ValidationError("No puedes usar un presupuesto de otro usuario.")

        return value

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                "La fecha de fin no puede ser anterior a la fecha de inicio."
            )

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                "La hora de fin debe ser posterior a la hora de inicio."
            )

        return attrs
