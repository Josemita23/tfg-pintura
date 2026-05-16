from datetime import date, datetime, time

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from clients.models import Client
from jobs.models import Job

from .models import CalendarEvent
from .views import sync_calendar_event_with_job


def make_aware(year, month, day, hour, minute=0):
    return timezone.make_aware(
        datetime(year, month, day, hour, minute),
        timezone.get_current_timezone(),
    )


class CalendarEventOverlapTests(TestCase):
    def setUp(self):
        self.client = Client.objects.create(
            first_name="Jose",
            last_name="Garcia",
            phone="611111111",
        )

    def create_legacy_multi_day_job_event(self):
        job = Job.objects.create(
            client=self.client,
            title="Trabajo de varios dias",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 20),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )

        return CalendarEvent.objects.create(
            job=job,
            title="Trabajo de varios dias - Jose Garcia",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 5, 18, 9),
            end_at=make_aware(2026, 5, 20, 13),
            status=CalendarEvent.Status.PLANNED,
        )

    def test_allows_visit_outside_daily_hours_of_legacy_multi_day_job_event(self):
        self.create_legacy_multi_day_job_event()

        event = CalendarEvent(
            title="Visita por la tarde",
            event_type=CalendarEvent.EventType.VISIT,
            start_at=make_aware(2026, 5, 19, 15),
            end_at=make_aware(2026, 5, 19, 16),
            status=CalendarEvent.Status.PLANNED,
        )

        event.full_clean()

    def test_rejects_visit_inside_daily_hours_of_legacy_multi_day_job_event(self):
        self.create_legacy_multi_day_job_event()

        event = CalendarEvent(
            title="Visita solapada",
            event_type=CalendarEvent.EventType.VISIT,
            start_at=make_aware(2026, 5, 19, 12),
            end_at=make_aware(2026, 5, 19, 14),
            status=CalendarEvent.Status.PLANNED,
        )

        with self.assertRaisesMessage(ValidationError, "Ya existe un evento planificado"):
            event.full_clean()

    def test_job_event_status_does_not_update_job_or_sibling_events(self):
        job = Job.objects.create(
            client=self.client,
            title="Trabajo por jornadas",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 19),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )
        first_event = CalendarEvent.objects.create(
            job=job,
            title="Trabajo por jornadas - Jose Garcia",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 5, 18, 9),
            end_at=make_aware(2026, 5, 18, 13),
            status=CalendarEvent.Status.CANCELLED,
        )
        second_event = CalendarEvent.objects.create(
            job=job,
            title="Trabajo por jornadas - Jose Garcia",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 5, 19, 9),
            end_at=make_aware(2026, 5, 19, 13),
            status=CalendarEvent.Status.PLANNED,
        )

        sync_calendar_event_with_job(first_event)
        job.refresh_from_db()
        second_event.refresh_from_db()

        self.assertEqual(job.status, Job.Status.PLANNED)
        self.assertEqual(first_event.status, CalendarEvent.Status.CANCELLED)
        self.assertEqual(second_event.status, CalendarEvent.Status.PLANNED)
