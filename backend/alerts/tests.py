from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

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
