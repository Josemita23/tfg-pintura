from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import CalendarEvent
from .serializers import CalendarEventSerializer


def format_django_validation_error(error):
    return error.message_dict if hasattr(error, "message_dict") else error.messages


def build_calendar_event_title(job):
    client_name = str(job.client).strip() if job.client else ""

    if client_name:
        return f"{job.title} - {client_name}"

    return job.title


def sync_calendar_event_with_job(event):
    if not event.job_id or event.event_type != CalendarEvent.EventType.JOB:
        return

    job = event.job
    event_title = build_calendar_event_title(job)

    CalendarEvent.objects.filter(pk=event.pk).update(title=event_title, job=job)

    event.title = event_title
    event.job = job


def protect_job_event_type(serializer):
    if not serializer.instance:
        return

    current_event = serializer.instance

    if not current_event.job_id or current_event.event_type != CalendarEvent.EventType.JOB:
        return

    requested_event_type = serializer.validated_data.get("event_type", current_event.event_type)

    if requested_event_type != CalendarEvent.EventType.JOB:
        raise serializers.ValidationError(
            {"event_type": "Un trabajo planificado no se puede cambiar a visita o recordatorio."}
        )


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.select_related("job", "job__client").all()
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = CalendarEvent.objects.select_related("job", "job__client").filter(
            owner=self.request.user
        )
        selected_date = self.request.query_params.get("date", "").strip()
        start_date = self.request.query_params.get("start_date", "").strip()
        end_date = self.request.query_params.get("end_date", "").strip()

        if selected_date:
            queryset = queryset.filter(start_at__date=selected_date)

        if start_date:
            queryset = queryset.filter(start_at__date__gte=start_date)

        if end_date:
            queryset = queryset.filter(start_at__date__lte=end_date)

        return queryset

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                event = serializer.save(owner=self.request.user)
                sync_calendar_event_with_job(event)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                protect_job_event_type(serializer)
                event = serializer.save()
                sync_calendar_event_with_job(event)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))
