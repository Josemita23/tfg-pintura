from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppSettings
from .serializers import AppSettingsSerializer


class AppSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        app_settings, _ = AppSettings.objects.get_or_create(owner=self.request.user)
        return app_settings

    def get(self, request):
        serializer = AppSettingsSerializer(self.get_object())
        return Response(serializer.data)

    def patch(self, request):
        app_settings = self.get_object()

        serializer = AppSettingsSerializer(
            app_settings,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        from alerts.services import generate_due_job_reminder_alerts

        generate_due_job_reminder_alerts(
            owner=request.user,
            upcoming_job_days=serializer.instance.upcoming_job_days,
        )

        return Response(serializer.data)