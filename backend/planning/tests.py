from datetime import date, datetime, time

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

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


class PlanningAPITestCase(APITestCase):
    def setUp(self):
        self.planning_url = "/api/planning/"

        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="test123")
        self.client.force_authenticate(user=self.user)

        self.customer = Client.objects.create(
            owner=self.user,
            first_name="Manuel",
            last_name="Lopez",
            phone="600000000",
            email="manuel@example.com",
            address="Sevilla",
            status=Client.Status.ACTIVE,
        )

        self.job_one = Job.objects.create(
            owner=self.user,
            client=self.customer,
            title="Pintura de salon",
            description="Pintar paredes y techo",
            address="Calle Feria, Sevilla",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 18),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
        )
        self.job_two = Job.objects.create(
            owner=self.user,
            client=self.customer,
            title="Pintura de dormitorio",
            description="Pintar dormitorio principal",
            address="Avenida Espana, Dos Hermanas",
            start_date=date(2026, 5, 20),
            end_date=date(2026, 5, 20),
            start_time=time(10, 0),
            end_time=time(14, 0),
            status=Job.Status.PLANNED,
        )
        self.job_three = Job.objects.create(
            owner=self.user,
            client=self.customer,
            title="Pintura de cocina",
            description="Pintar cocina",
            address="Calle Sierpes, Sevilla",
            start_date=date(2026, 6, 3),
            end_date=date(2026, 6, 3),
            start_time=time(9, 0),
            end_time=time(12, 0),
            status=Job.Status.PLANNED,
        )

        self.event_one = CalendarEvent.objects.create(
            owner=self.user,
            job=self.job_one,
            title="Pintura de salon - Manuel Lopez",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 5, 18, 9),
            end_at=make_aware(2026, 5, 18, 13),
            location="Calle Feria, Sevilla",
            description="Pintar paredes y techo",
            status=CalendarEvent.Status.PLANNED,
        )
        self.event_two = CalendarEvent.objects.create(
            owner=self.user,
            job=self.job_two,
            title="Pintura de dormitorio - Manuel Lopez",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 5, 20, 10),
            end_at=make_aware(2026, 5, 20, 14),
            location="Avenida Espana, Dos Hermanas",
            description="Pintar dormitorio principal",
            status=CalendarEvent.Status.PLANNED,
        )
        self.event_three = CalendarEvent.objects.create(
            owner=self.user,
            job=self.job_three,
            title="Pintura de cocina - Manuel Lopez",
            event_type=CalendarEvent.EventType.JOB,
            start_at=make_aware(2026, 6, 3, 9),
            end_at=make_aware(2026, 6, 3, 12),
            location="Calle Sierpes, Sevilla",
            description="Pintar cocina",
            status=CalendarEvent.Status.PLANNED,
        )

    def test_pu_pla_01_consultar_el_calendario_de_trabajos(self):
        response = self.client.get(self.planning_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        event_titles = [event["title"] for event in response.data]

        self.assertIn("Pintura de salon - Manuel Lopez", event_titles)
        self.assertIn("Pintura de dormitorio - Manuel Lopez", event_titles)
        self.assertIn("Pintura de cocina - Manuel Lopez", event_titles)

    def test_pu_pla_02_visualizar_trabajos_por_dia(self):
        response = self.client.get(self.planning_url, {"date": "2026-05-18"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.event_one.id)
        self.assertEqual(response.data[0]["job_title"], "Pintura de salon")

    def test_pu_pla_03_visualizar_trabajos_por_semana(self):
        response = self.client.get(
            self.planning_url,
            {"start_date": "2026-05-18", "end_date": "2026-05-24"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        event_titles = [event["title"] for event in response.data]

        self.assertIn("Pintura de salon - Manuel Lopez", event_titles)
        self.assertIn("Pintura de dormitorio - Manuel Lopez", event_titles)
        self.assertNotIn("Pintura de cocina - Manuel Lopez", event_titles)

    def test_pu_pla_04_visualizar_trabajos_por_mes(self):
        response = self.client.get(
            self.planning_url,
            {"start_date": "2026-05-01", "end_date": "2026-05-31"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        event_titles = [event["title"] for event in response.data]

        self.assertIn("Pintura de salon - Manuel Lopez", event_titles)
        self.assertIn("Pintura de dormitorio - Manuel Lopez", event_titles)
        self.assertNotIn("Pintura de cocina - Manuel Lopez", event_titles)

    def test_pu_pla_05_consultar_detalle_desde_el_calendario(self):
        response = self.client.get(f"{self.planning_url}{self.event_one.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.event_one.id)
        self.assertEqual(response.data["job"], self.job_one.id)
        self.assertEqual(response.data["job_title"], "Pintura de salon")
        self.assertEqual(response.data["job_client_name"], "Manuel Lopez")
        self.assertEqual(response.data["job_display_name"], "Pintura de salon - Manuel Lopez")
        self.assertEqual(response.data["location"], "Calle Feria, Sevilla")
        self.assertEqual(response.data["description"], "Pintar paredes y techo")
