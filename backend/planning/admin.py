from django.contrib import admin

from .models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "event_type",
        "job",
        "start_at",
        "end_at",
        "status",
    )
    search_fields = ("title", "job__title", "location")
    list_filter = ("event_type", "status", "start_at")
    ordering = ("start_at",)