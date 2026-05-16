from datetime import date, time

from django.test import TestCase
from django.utils import timezone

from clients.models import Client
from planning.models import CalendarEvent

from .models import Job
from .views import sync_job_calendar_event


class JobCalendarSyncTests(TestCase):
    def setUp(self):
        self.client = Client.objects.create(
            first_name="Jose",
            last_name="Garcia",
            phone="600000000",
        )

    def test_multi_day_job_creates_one_calendar_event_per_day(self):
        job = Job.objects.create(
            client=self.client,
            title="Pintura de piso",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 20),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )

        sync_job_calendar_event(job)

        events = CalendarEvent.objects.filter(job=job).order_by("start_at")

        self.assertEqual(events.count(), 3)
        self.assertEqual([event.start_at.date() for event in events], [
            date(2026, 5, 18),
            date(2026, 5, 19),
            date(2026, 5, 20),
        ])
        self.assertTrue(
            all(timezone.localtime(event.start_at).time().hour == 9 for event in events)
        )
        self.assertTrue(
            all(timezone.localtime(event.end_at).time().hour == 13 for event in events)
        )

    def test_multi_day_job_allows_another_job_on_same_day_outside_daily_hours(self):
        first_job = Job.objects.create(
            client=self.client,
            title="Manana",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 20),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )
        second_job = Job.objects.create(
            client=self.client,
            title="Tarde",
            start_date=date(2026, 5, 19),
            end_date=date(2026, 5, 19),
            start_time=time(15, 0),
            end_time=time(17, 0),
            status=Job.Status.PLANNED,
        )

        sync_job_calendar_event(first_job)
        sync_job_calendar_event(second_job)

        self.assertEqual(CalendarEvent.objects.count(), 4)

    def test_multi_day_job_still_rejects_real_time_overlap(self):
        first_job = Job.objects.create(
            client=self.client,
            title="Manana",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 20),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )
        overlapping_job = Job.objects.create(
            client=self.client,
            title="Solape",
            start_date=date(2026, 5, 19),
            end_date=date(2026, 5, 19),
            start_time=time(12, 0),
            end_time=time(14, 0),
            status=Job.Status.PLANNED,
        )

        sync_job_calendar_event(first_job)

        with self.assertRaisesMessage(Exception, "Ya existe un evento planificado"):
            sync_job_calendar_event(overlapping_job)
