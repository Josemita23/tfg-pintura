from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from .models import Alert


DEFAULT_UPCOMING_JOB_DAYS = 3


def build_stock_alert_data(material):
    if material.status == material.Status.OUT_OF_STOCK:
        return {
            "alert_type": Alert.AlertType.OUT_OF_STOCK,
            "priority": Alert.Priority.HIGH,
            "title": f"Material agotado: {material.name}",
            "description": (
                f"El material {material.name} no tiene stock disponible. "
                f"Cantidad actual: {material.quantity_available} {material.unit}."
            ),
        }

    if material.status == material.Status.LOW_STOCK:
        return {
            "alert_type": Alert.AlertType.LOW_STOCK,
            "priority": Alert.Priority.MEDIUM,
            "title": f"Stock bajo: {material.name}",
            "description": (
                f"El material {material.name} está por debajo del stock mínimo. "
                f"Cantidad actual: {material.quantity_available} {material.unit}. "
                f"Stock mínimo: {material.minimum_stock} {material.unit}."
            ),
        }

    return None


def sync_stock_alert_for_material(material):
    stock_alert_types = [
        Alert.AlertType.LOW_STOCK,
        Alert.AlertType.OUT_OF_STOCK,
    ]

    unread_stock_alerts = Alert.objects.filter(
        material=material,
        alert_type__in=stock_alert_types,
        is_read=False,
    )

    alert_data = build_stock_alert_data(material)

    if alert_data is None:
        unread_stock_alerts.update(is_read=True)
        return None

    existing_alert = unread_stock_alerts.first()

    if existing_alert:
        for field, value in alert_data.items():
            setattr(existing_alert, field, value)

        existing_alert.save(
            update_fields=[
                "alert_type",
                "priority",
                "title",
                "description",
                "updated_at",
            ]
        )

        return existing_alert

    return Alert.objects.create(
        owner=material.owner,
        material=material,
        **alert_data,
    )


def generate_stock_alerts_for_all_materials(owner=None):
    from materials.models import Material

    materials = Material.objects.filter(
        status__in=[
            Material.Status.LOW_STOCK,
            Material.Status.OUT_OF_STOCK,
        ]
    )

    if owner:
        materials = materials.filter(Q(owner=owner) | Q(owner__isnull=True))

    generated_alerts = []

    for material in materials:
        alert = sync_stock_alert_for_material(material)

        if alert:
            generated_alerts.append(alert)

    return generated_alerts


def get_saved_upcoming_job_days(owner):
    if not owner or not getattr(owner, "is_authenticated", False):
        return DEFAULT_UPCOMING_JOB_DAYS

    try:
        from app_settings.models import AppSettings
    except Exception:
        return DEFAULT_UPCOMING_JOB_DAYS

    app_settings = AppSettings.objects.filter(owner=owner).first()

    if not app_settings:
        return DEFAULT_UPCOMING_JOB_DAYS

    return app_settings.upcoming_job_days


def get_active_job_reminder_statuses():
    from jobs.models import Job

    return [
        Job.Status.PENDING,
        Job.Status.PLANNED,
    ]


def build_job_reminder_alert_data(job, days_until_start):
    if days_until_start == 0:
        date_text = "hoy"
        priority = Alert.Priority.HIGH
    elif days_until_start == 1:
        date_text = "mañana"
        priority = Alert.Priority.MEDIUM
    else:
        date_text = f"dentro de {days_until_start} días"
        priority = Alert.Priority.MEDIUM

    client_name = str(job.client).strip() if job.client else "cliente sin indicar"

    return {
        "alert_type": Alert.AlertType.JOB_REMINDER,
        "priority": priority,
        "title": f"Trabajo próximo: {job.title}",
        "description": (
            f"El trabajo {job.title} para {client_name} está previsto para {date_text}."
        ),
    }

def sync_job_reminder_alert_for_job(
    job,
    owner,
    reference_date=None,
    upcoming_job_days=None,
):
    reference_date = reference_date or timezone.localdate()

    if upcoming_job_days is None:
        upcoming_job_days = get_saved_upcoming_job_days(owner)

    if not owner or not getattr(owner, "is_authenticated", False):
        return None

    job_reminders = Alert.objects.filter(
        owner=owner,
        job=job,
        alert_type=Alert.AlertType.JOB_REMINDER,
    ).order_by("-created_at")

    if not job.start_date or job.status not in get_active_job_reminder_statuses():
        job_reminders.delete()
        return None

    days_until_start = (job.start_date - reference_date).days

    if days_until_start < 0 or days_until_start > upcoming_job_days:
        job_reminders.delete()
        return None

    alert_data = build_job_reminder_alert_data(job, days_until_start)

    existing_alert = job_reminders.first()

    if existing_alert:
        job_reminders.exclude(id=existing_alert.id).delete()

        for field, value in alert_data.items():
            setattr(existing_alert, field, value)

        existing_alert.material = None
        existing_alert.calendar_event = None

        existing_alert.save(
            update_fields=[
                "alert_type",
                "priority",
                "title",
                "description",
                "material",
                "calendar_event",
                "updated_at",
            ]
        )

        return existing_alert

    try:
        with transaction.atomic():
            return Alert.objects.create(
                owner=owner,
                job=job,
                material=None,
                calendar_event=None,
                **alert_data,
            )
    except IntegrityError:
        existing_alert = Alert.objects.filter(
            owner=owner,
            job=job,
            alert_type=Alert.AlertType.JOB_REMINDER,
        ).order_by("-created_at").first()

        return existing_alert

def mark_stale_job_reminders_as_read(owner, reference_date, upcoming_job_days):
    if not owner or not getattr(owner, "is_authenticated", False):
        return

    limit_date = reference_date + timedelta(days=upcoming_job_days)
    active_statuses = get_active_job_reminder_statuses()

    stale_filter = (
        Q(job__isnull=True)
        | Q(job__start_date__lt=reference_date)
        | Q(job__start_date__gt=limit_date)
        | ~Q(job__status__in=active_statuses)
    )

    Alert.objects.filter(
        owner=owner,
        alert_type=Alert.AlertType.JOB_REMINDER,
        is_read=False,
    ).filter(stale_filter).update(is_read=True)

def generate_job_reminder_alerts(owner=None, upcoming_job_days=None):
    from jobs.models import Job

    if not owner or not getattr(owner, "is_authenticated", False):
        return []

    reference_date = timezone.localdate()

    if upcoming_job_days is None:
        upcoming_job_days = get_saved_upcoming_job_days(owner)

    limit_date = reference_date + timedelta(days=upcoming_job_days)

    # Limpia alertas antiguas de recordatorio que se hubieran creado por evento de calendario.
    # Para este TFG queremos 1 alerta por trabajo, no 1 alerta por cada día/evento.
    Alert.objects.filter(
        owner=owner,
        alert_type=Alert.AlertType.JOB_REMINDER,
        job__isnull=True,
    ).delete()

    # Si alguna alerta de trabajo próximo conserva calendar_event, lo quitamos.
    Alert.objects.filter(
        owner=owner,
        alert_type=Alert.AlertType.JOB_REMINDER,
        calendar_event__isnull=False,
    ).update(calendar_event=None)

    jobs = Job.objects.select_related("client").filter(
        owner=owner,
        start_date__gte=reference_date,
        start_date__lte=limit_date,
        status__in=get_active_job_reminder_statuses(),
    ).distinct()

    current_job_ids = list(jobs.values_list("id", flat=True))

    Alert.objects.filter(
        owner=owner,
        alert_type=Alert.AlertType.JOB_REMINDER,
    ).exclude(
        job_id__in=current_job_ids,
    ).delete()

    generated_alerts = []

    for job in jobs:
        alert = sync_job_reminder_alert_for_job(
            job=job,
            owner=owner,
            reference_date=reference_date,
            upcoming_job_days=upcoming_job_days,
        )

        if alert:
            generated_alerts.append(alert)

    return generated_alerts

def job_reminder_was_already_generated_today(job, owner, reference_date):
    return Alert.objects.filter(
        owner=owner,
        job=job,
        alert_type=Alert.AlertType.JOB_REMINDER,
        created_at__date=reference_date,
    ).exists()

def generate_due_job_reminder_alerts(owner, upcoming_job_days=None):
    from jobs.models import Job

    if not owner or not getattr(owner, "is_authenticated", False):
        return []

    reference_date = timezone.localdate()

    if upcoming_job_days is None:
        upcoming_job_days = get_saved_upcoming_job_days(owner)

    target_date = reference_date + timedelta(days=upcoming_job_days)

    jobs = Job.objects.select_related("client").filter(
        owner=owner,
        start_date=target_date,
        status__in=get_active_job_reminder_statuses(),
    )

    generated_alerts = []

    for job in jobs:
        if job_reminder_was_already_generated_today(
            job=job,
            owner=owner,
            reference_date=reference_date,
        ):
            continue

        alert = sync_job_reminder_alert_for_job(
            job=job,
            owner=owner,
            reference_date=reference_date,
            upcoming_job_days=upcoming_job_days,
        )

        if alert:
            generated_alerts.append(alert)

    return generated_alerts


def generate_due_job_reminder_alerts_for_all_users():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    generated_alerts = []

    users = User.objects.filter(is_active=True)

    for user in users:
        user_generated_alerts = generate_due_job_reminder_alerts(owner=user)
        generated_alerts.extend(user_generated_alerts)

    return generated_alerts
