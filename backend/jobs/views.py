from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Job
from .serializers import JobSerializer


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related("client", "budget").all()
    serializer_class = JobSerializer
    permission_classes = [AllowAny]