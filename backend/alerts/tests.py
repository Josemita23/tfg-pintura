from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from jobs.models import Job

from .models import Alert
from .services import generate_job_reminder_alerts


class JobReminderAlertTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="painter",
            email="painter@example.com",
            password="testpass123",
        )
        self.client = Client.objects.create(
            owner=self.user,
            first_name="Cliente",
            phone="600000001",
        )
        self.job = Job.objects.create(
            owner=self.user,
            client=self.client,
            title="Pintar salon",
            start_date=timezone.localdate() + timedelta(days=2),
            status=Job.Status.PLANNED,
        )

    def test_read_job_reminder_is_not_reopened_when_generated_again(self):
        generate_job_reminder_alerts(owner=self.user, upcoming_job_days=3)

        alert = Alert.objects.get(
            owner=self.user,
            job=self.job,
            alert_type=Alert.AlertType.JOB_REMINDER,
        )
        alert.is_read = True
        alert.save(update_fields=["is_read", "updated_at"])

        generate_job_reminder_alerts(owner=self.user, upcoming_job_days=3)

        alerts = Alert.objects.filter(
            owner=self.user,
            job=self.job,
            alert_type=Alert.AlertType.JOB_REMINDER,
        )

        self.assertEqual(alerts.count(), 1)
        self.assertTrue(alerts.first().is_read)

    def test_only_one_job_reminder_can_exist_for_same_job(self):
        Alert.objects.create(
            owner=self.user,
            job=self.job,
            alert_type=Alert.AlertType.JOB_REMINDER,
            title="Trabajo proximo",
            description="Primer aviso",
        )

        with self.assertRaises(IntegrityError):
            Alert.objects.create(
                owner=self.user,
                job=self.job,
                alert_type=Alert.AlertType.JOB_REMINDER,
                title="Trabajo proximo",
                description="Segundo aviso",
            )


class AlertAPITestCase(APITestCase):
    def setUp(self):
        self.alerts_url = "/api/alerts/"

        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="test123")
        self.client.force_authenticate(user=self.user)

        self.low_stock_alert = Alert.objects.create(
            owner=self.user,
            alert_type=Alert.AlertType.LOW_STOCK,
            title="Stock bajo: Pintura blanca",
            description="La pintura blanca esta por debajo del stock minimo.",
            priority=Alert.Priority.MEDIUM,
            is_read=False,
        )
        self.job_reminder_alert = Alert.objects.create(
            owner=self.user,
            alert_type=Alert.AlertType.JOB_REMINDER,
            title="Trabajo proximo: Pintura de salon",
            description="El trabajo esta previsto para manana.",
            priority=Alert.Priority.HIGH,
            is_read=True,
        )

    def test_pu_ale_01_consultar_lista_de_alertas(self):
        response = self.client.get(self.alerts_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        alert_titles = [alert["title"] for alert in response.data]

        self.assertIn("Stock bajo: Pintura blanca", alert_titles)
        self.assertIn("Trabajo proximo: Pintura de salon", alert_titles)

    def test_pu_ale_02_buscar_alerta_por_tipo_fecha_prioridad_o_estado(self):
        response_by_type = self.client.get(
            self.alerts_url,
            {"alert_type": Alert.AlertType.LOW_STOCK},
        )
        self.assertEqual(response_by_type.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_type.data), 1)
        self.assertEqual(response_by_type.data[0]["title"], "Stock bajo: Pintura blanca")

        response_by_date = self.client.get(
            self.alerts_url,
            {"date": timezone.localdate().isoformat()},
        )
        self.assertEqual(response_by_date.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_date.data), 2)

        response_by_priority = self.client.get(
            self.alerts_url,
            {"priority": Alert.Priority.HIGH},
        )
        self.assertEqual(response_by_priority.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_priority.data), 1)
        self.assertEqual(response_by_priority.data[0]["title"], "Trabajo proximo: Pintura de salon")

        response_by_status = self.client.get(self.alerts_url, {"is_read": "false"})
        self.assertEqual(response_by_status.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_status.data), 1)
        self.assertEqual(response_by_status.data[0]["title"], "Stock bajo: Pintura blanca")

    def test_pu_ale_03_marcar_alerta_como_leida(self):
        response = self.client.post(
            f"{self.alerts_url}{self.low_stock_alert.id}/mark-as-read/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        self.low_stock_alert.refresh_from_db()

        self.assertTrue(self.low_stock_alert.is_read)
