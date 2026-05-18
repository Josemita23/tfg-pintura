from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

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


class JobAPITestCase(APITestCase):
    def setUp(self):
        self.jobs_url = "/api/jobs/"

        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="test123")
        self.client.force_authenticate(user=self.user)

        self.customer_one = Client.objects.create(
            owner=self.user,
            first_name="Manuel",
            last_name="Lopez",
            phone="600000000",
            email="manuel@example.com",
            address="Sevilla",
            status=Client.Status.ACTIVE,
        )
        self.customer_two = Client.objects.create(
            owner=self.user,
            first_name="Carmen",
            last_name="Ruiz",
            phone="611111111",
            email="carmen@example.com",
            address="Dos Hermanas",
            status=Client.Status.ACTIVE,
        )

        self.job_one = Job.objects.create(
            owner=self.user,
            client=self.customer_one,
            title="Pintura de salon",
            description="Pintar paredes y techo",
            address="Calle Feria, Sevilla",
            start_date=date(2026, 5, 18),
            end_date=date(2026, 5, 18),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.PLANNED,
            notes="Usar pintura lavable",
        )
        self.job_two = Job.objects.create(
            owner=self.user,
            client=self.customer_two,
            title="Pintura de dormitorio",
            description="Pintar habitacion principal",
            address="Avenida Espana, Dos Hermanas",
            start_date=date(2026, 5, 20),
            end_date=date(2026, 5, 20),
            start_time=time(10, 0),
            end_time=time(14, 0),
            status=Job.Status.PENDING,
        )

    def test_pu_tra_01_consultar_lista_de_trabajos(self):
        response = self.client.get(self.jobs_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        job_titles = [job["title"] for job in response.data]

        self.assertIn("Pintura de salon", job_titles)
        self.assertIn("Pintura de dormitorio", job_titles)

    def test_pu_tra_02_buscar_trabajo_por_cliente_direccion_fecha_o_estado(self):
        response_by_client = self.client.get(self.jobs_url, {"search": "Manuel"})
        self.assertEqual(response_by_client.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_client.data), 1)
        self.assertEqual(response_by_client.data[0]["title"], "Pintura de salon")

        response_by_address = self.client.get(self.jobs_url, {"search": "Dos Hermanas"})
        self.assertEqual(response_by_address.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_address.data), 1)
        self.assertEqual(response_by_address.data[0]["title"], "Pintura de dormitorio")

        response_by_date = self.client.get(self.jobs_url, {"search": "2026-05-18"})
        self.assertEqual(response_by_date.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_date.data), 1)
        self.assertEqual(response_by_date.data[0]["title"], "Pintura de salon")

        response_by_status = self.client.get(self.jobs_url, {"status": Job.Status.PENDING})
        self.assertEqual(response_by_status.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_status.data), 1)
        self.assertEqual(response_by_status.data[0]["title"], "Pintura de dormitorio")

    def test_pu_tra_03_ver_detalle_de_un_trabajo(self):
        response = self.client.get(f"{self.jobs_url}{self.job_one.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job_one.id)
        self.assertEqual(response.data["client"], self.customer_one.id)
        self.assertEqual(response.data["client_name"], "Manuel Lopez")
        self.assertEqual(response.data["title"], "Pintura de salon")
        self.assertEqual(response.data["description"], "Pintar paredes y techo")
        self.assertEqual(response.data["address"], "Calle Feria, Sevilla")
        self.assertEqual(response.data["status"], Job.Status.PLANNED)

    def test_pu_tra_04_editar_trabajo_existente(self):
        payload = {
            "title": "Pintura de salon actualizada",
            "description": "Pintar paredes, techo y molduras",
            "address": "Nueva direccion, Sevilla",
            "start_time": "08:30:00",
            "end_time": "12:30:00",
        }

        response = self.client.patch(
            f"{self.jobs_url}{self.job_one.id}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.job_one.refresh_from_db()

        self.assertEqual(self.job_one.title, "Pintura de salon actualizada")
        self.assertEqual(self.job_one.description, "Pintar paredes, techo y molduras")
        self.assertEqual(self.job_one.address, "Nueva direccion, Sevilla")
        self.assertEqual(self.job_one.start_time, time(8, 30))
        self.assertEqual(self.job_one.end_time, time(12, 30))

    def test_pu_tra_05_actualizar_estado_de_un_trabajo(self):
        response = self.client.patch(
            f"{self.jobs_url}{self.job_two.id}/",
            {"status": Job.Status.IN_PROGRESS},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Job.Status.IN_PROGRESS)

        detail_response = self.client.get(f"{self.jobs_url}{self.job_two.id}/")

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["status"], Job.Status.IN_PROGRESS)

        list_response = self.client.get(self.jobs_url, {"status": Job.Status.IN_PROGRESS})

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["id"], self.job_two.id)

    def test_pu_tra_06_eliminar_trabajo_sin_finalizar(self):
        deletable_job = Job.objects.create(
            owner=self.user,
            client=self.customer_one,
            title="Trabajo pendiente sin iniciar",
            address="Sevilla",
            status=Job.Status.PENDING,
        )

        response = self.client.delete(f"{self.jobs_url}{deletable_job.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Job.objects.filter(id=deletable_job.id).exists())

        started_job = Job.objects.create(
            owner=self.user,
            client=self.customer_one,
            title="Trabajo iniciado",
            address="Sevilla",
            start_date=date(2026, 5, 21),
            end_date=date(2026, 5, 21),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.IN_PROGRESS,
        )

        response = self.client.delete(f"{self.jobs_url}{started_job.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Job.objects.filter(id=started_job.id).exists())

        update_response = self.client.patch(
            f"{self.jobs_url}{started_job.id}/",
            {"status": Job.Status.CANCELLED},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], Job.Status.CANCELLED)

    def test_pu_tra_07_eliminar_trabajo_finalizado(self):
        finished_job = Job.objects.create(
            owner=self.user,
            client=self.customer_one,
            title="Trabajo finalizado",
            address="Sevilla",
            start_date=date(2026, 5, 15),
            end_date=date(2026, 5, 15),
            start_time=time(9, 0),
            end_time=time(13, 0),
            status=Job.Status.FINISHED,
        )

        response = self.client.delete(f"{self.jobs_url}{finished_job.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Job.objects.filter(id=finished_job.id).exists())
