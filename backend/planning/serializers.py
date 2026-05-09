from rest_framework import serializers

from .models import CalendarEvent


class CalendarEventSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "job",
            "job_title",
            "title",
            "event_type",
            "start_at",
            "end_at",
            "location",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "job_title", "created_at", "updated_at"]

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))

        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError(
                "La fecha y hora de fin debe ser posterior a la de inicio."
            )

        overlapping_events = CalendarEvent.objects.filter(
            start_at__lt=end_at,
            end_at__gt=start_at,
        ).exclude(status=CalendarEvent.Status.CANCELLED)

        if self.instance:
            overlapping_events = overlapping_events.exclude(pk=self.instance.pk)

        if overlapping_events.exists():
            raise serializers.ValidationError(
                "Ya existe un evento planificado en ese intervalo de tiempo."
            )

        return attrs