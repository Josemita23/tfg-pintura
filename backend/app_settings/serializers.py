from rest_framework import serializers

from .models import AppSettings


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = [
            "id",
            "default_start_time",
            "default_end_time",
            "low_stock_threshold",
            "upcoming_job_days",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_upcoming_job_days(self, value):
        if value < 1 or value > 365:
            raise serializers.ValidationError(
                "Los dias de aviso deben estar entre 1 y 365."
            )

        return value

    def validate_low_stock_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "El stock bajo por defecto no puede ser negativo."
            )

        return value

    def validate(self, attrs):
        default_start_time = attrs.get(
            "default_start_time",
            self.instance.default_start_time if self.instance else None,
        )

        default_end_time = attrs.get(
            "default_end_time",
            self.instance.default_end_time if self.instance else None,
        )

        if default_start_time and default_end_time and default_end_time <= default_start_time:
            raise serializers.ValidationError(
                {"default_end_time": "La hora de fin debe ser posterior a la de inicio."}
            )

        return attrs