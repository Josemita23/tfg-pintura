from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Client.objects.filter(owner=self.request.user)
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
