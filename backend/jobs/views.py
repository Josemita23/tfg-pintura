from datetime import datetime, time

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny

from .models import Job
from .serializers import JobSerializer


def build_job_datetime(date_value, time_value, default_time):
    selected_time = time_value or default_time
    date_time = datetime.combine(date_value, selected_time)

    if timezone.is_naive(date_time):
        return timezone.make_aware(date_time, timezone.get_current_timezone())

    return date_time

def build_calendar_event_title(job):
    client_name = str(job.client).strip() if job.client else ""

    if client_name:
        return f"{job.title} - {client_name}"

    return job.title

def get_calendar_status_from_job(job):
    if job.status == Job.Status.FINISHED:
        return "COMPLETED"

    if job.status == Job.Status.CANCELLED:
        return "CANCELLED"

    return "PLANNED"


def format_django_validation_error(error):
    return error.message_dict if hasattr(error, "message_dict") else error.messages


def sync_job_calendar_event(job):
    from planning.models import CalendarEvent

    job_events = CalendarEvent.objects.filter(
        job=job,
        event_type=CalendarEvent.EventType.JOB,
    )

    if not job.start_date:
        job_events.delete()
        return

    end_date = job.end_date or job.start_date

    start_at = build_job_datetime(
        job.start_date,
        job.start_time,
        time(9, 0),
    )

    end_at = build_job_datetime(
        end_date,
        job.end_time,
        time(18, 0),
    )

    if end_at <= start_at:
        raise serializers.ValidationError(
            {
                "end_time": "La fecha y hora de fin debe ser posterior a la de inicio."
            }
        )

    CalendarEvent.objects.update_or_create(
        job=job,
        event_type=CalendarEvent.EventType.JOB,
        defaults={
            "job": job,
            "title": build_calendar_event_title(job),
            "start_at": start_at,
            "end_at": end_at,
            "location": job.address,
            "description": job.description or job.notes,
            "status": get_calendar_status_from_job(job),
        },
    )

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related("client", "budget").all()
    serializer_class = JobSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                job = serializer.save()
                sync_job_calendar_event(job)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                job = serializer.save()
                sync_job_calendar_event(job)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))