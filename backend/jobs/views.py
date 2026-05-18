from datetime import datetime, timedelta, time

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Job
from .serializers import JobSerializer


def format_django_validation_error(error):
    return error.message_dict if hasattr(error, "message_dict") else error.messages


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
    start_time = job.start_time or time(9, 0)
    end_time = job.end_time or time(18, 0)

    if end_time <= start_time:
        raise serializers.ValidationError(
            {"end_time": "La hora de fin debe ser posterior a la hora de inicio."}
        )

    job_events.delete()

    current_date = job.start_date

    while current_date <= end_date:
        CalendarEvent.objects.create(
            owner=job.owner,
            job=job,
            title=build_calendar_event_title(job),
            event_type=CalendarEvent.EventType.JOB,
            start_at=build_job_datetime(current_date, start_time, time(9, 0)),
            end_at=build_job_datetime(current_date, end_time, time(18, 0)),
            location=job.address,
            description=job.description or job.notes,
            status=get_calendar_status_from_job(job),
        )
        current_date += timedelta(days=1)
        
def sync_job_dependent_data(job, owner):
    sync_job_calendar_event(job)

    from alerts.services import generate_due_job_reminder_alerts

    generate_due_job_reminder_alerts(owner=owner)

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related("client", "budget").all()
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Job.objects.select_related("client", "budget").filter(owner=self.request.user)
        search = self.request.query_params.get("search", "").strip()
        selected_status = self.request.query_params.get("status", "").strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(address__icontains=search)
                | Q(start_date__icontains=search)
                | Q(end_date__icontains=search)
                | Q(status__icontains=search)
            )

        if selected_status and selected_status != "ALL":
            queryset = queryset.filter(status=selected_status)

        return queryset

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                job = serializer.save(owner=self.request.user)
                sync_job_dependent_data(job, owner=self.request.user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                job = serializer.save()
                sync_job_dependent_data(job, owner=self.request.user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(format_django_validation_error(error))

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()

        has_associated_data = (
            job.budget_id
            or job.calendar_events.exists()
            or job.alerts.exists()
            or job.material_consumptions.exists()
        )

        if job.status != Job.Status.PENDING or has_associated_data:
            return Response(
                {
                    "detail": (
                        "Solo se pueden eliminar trabajos pendientes, sin iniciar "
                        "y sin informacion relevante asociada."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)
