from rest_framework import serializers

from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    job_title = serializers.CharField(source="job.title", read_only=True)
    calendar_event_title = serializers.CharField(source="calendar_event.title", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "alert_type",
            "title",
            "description",
            "priority",
            "is_read",
            "material",
            "material_name",
            "job",
            "job_title",
            "calendar_event",
            "calendar_event_title",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "material_name",
            "job_title",
            "calendar_event_title",
            "created_at",
            "updated_at",
        ]

    def _validate_owner(self, value, message):
        request = self.context.get("request")

        if value and request and value.owner_id != request.user.id:
            raise serializers.ValidationError(message)

        return value

    def validate_material(self, value):
        return self._validate_owner(value, "No puedes usar un material de otro usuario.")

    def validate_job(self, value):
        return self._validate_owner(value, "No puedes usar un trabajo de otro usuario.")

    def validate_calendar_event(self, value):
        return self._validate_owner(value, "No puedes usar un evento de otro usuario.")
