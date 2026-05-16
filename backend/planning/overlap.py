from datetime import datetime, timedelta

from django.utils import timezone


def _local_interval(start_at, end_at):
    return timezone.localtime(start_at), timezone.localtime(end_at)


def _make_aware(date_value, time_value):
    date_time = datetime.combine(date_value, time_value)

    if timezone.is_naive(date_time):
        return timezone.make_aware(date_time, timezone.get_current_timezone())

    return date_time


def _intervals_overlap(first_start, first_end, second_start, second_end):
    return first_start < second_end and first_end > second_start


def _iter_job_daily_intervals(event):
    job = event.job

    if not job or not job.start_date or not job.start_time or not job.end_time:
        yield _local_interval(event.start_at, event.end_at)
        return

    current_date = job.start_date
    end_date = job.end_date or job.start_date

    while current_date <= end_date:
        yield (
            _make_aware(current_date, job.start_time),
            _make_aware(current_date, job.end_time),
        )
        current_date += timedelta(days=1)


def find_overlapping_calendar_events(model, start_at, end_at, instance=None):
    candidates = model.objects.filter(
        start_at__lt=end_at,
        end_at__gt=start_at,
    ).exclude(status=model.Status.CANCELLED)

    if instance and getattr(instance, "owner_id", None):
        candidates = candidates.filter(owner=instance.owner)

    if instance and instance.pk:
        candidates = candidates.exclude(pk=instance.pk)

    start_at, end_at = _local_interval(start_at, end_at)
    overlapping_events = []

    for event in candidates.select_related("job"):
        if event.event_type != model.EventType.JOB:
            event_start, event_end = _local_interval(event.start_at, event.end_at)

            if _intervals_overlap(start_at, end_at, event_start, event_end):
                overlapping_events.append(event)

            continue

        for event_start, event_end in _iter_job_daily_intervals(event):
            if _intervals_overlap(start_at, end_at, event_start, event_end):
                overlapping_events.append(event)
                break

    return overlapping_events
