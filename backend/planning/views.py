from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny

from jobs.models import Job

from .models import CalendarEvent
from .serializers import CalendarEventSerializer


def format_django_validation_error(error):
    return error.message_dict if hasattr(error, "message_dict") else error.messages

def get_job_status_from_calendar_event(event):
    if event.status == CalendarEvent.Status.COMPLETED:
        return Job.Status.FINISHED

    if event.status == CalendarEvent.Status.CANCELLED:
        return Job.Status.CANCELLED

    return Job.Status.PLANNED

def clean_time(value):
    return value.replace(second=0, microsecond=0)

def sync_calendar_event_with_job(event):
    if not event.job_id or event.event_type != CalendarEvent.EventType.JOB:
        return

    start_at = timezone.localtime(event.start_at)
    end_at = timezone.localtime(event.end_at)

    job = event.job
    job.title = get_clean_job_title_from_event(event)
    job.description = event.description
    job.address = event.location
    job.start_date = start_at.date()
    job.end_date = end_at.date()
    job.start_time = clean_time(start_at.time())
    job.end_time = clean_time(end_at.time())
    job.status = get_job_status_from_calendar_event(event)

    job.full_clean()
    job.save(
        update_fields=[
            "title",
            "description",
            "address",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "status",
            "updated_at",
        ]
    )
    event_title = build_calendar_event_title(job)

    CalendarEvent.objects.filter(pk=event.pk).update(
        title=event_title,
        job=job,
    )

    event.title = event_title
    event.job = job

def build_calendar_event_title(job):
    client_name = str(job.client).strip() if job.client else ""

    if client_name:
        return f"{job.title} - {client_name}"

    return job.title

def get_clean_job_title_from_event(event):
    title = event.title.strip()

    if not event.job or not event.job.client:
        return title

    client_suffix = f" - {str(event.job.client).strip()}"

    if title.endswith(client_suffix):
        return title[: -len(client_suffix)].strip()

    return title

class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.select_related("job").all()
    serializer_class = CalendarEventSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                event = serializer.save()
                sync_calendar_event_with_job(event)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                event = serializer.save()
                sync_calendar_event_with_job(event)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))