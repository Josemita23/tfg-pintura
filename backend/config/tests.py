from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from budgets.models import Budget
from clients.models import Client
from jobs.models import Job
from materials.models import Material


class AuthAPITestCase(APITestCase):
    def setUp(self):
        self.login_url = "/api/auth/login/"
        self.logout_url = "/api/auth/logout/"
        self.protected_url = "/api/clients/"

        User = get_user_model()
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="test123",
            first_name="Usuario",
            last_name="Prueba",
        )

    def test_pu_aut_01_iniciar_sesion_con_credenciales_correctas(self):
        response = self.client.post(
            self.login_url,
            {"username": "tester", "password": "test123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "tester")
        self.assertEqual(response.data["user"]["full_name"], "Usuario Prueba")

    def test_pu_aut_02_iniciar_sesion_con_credenciales_incorrectas(self):
        response = self.client.post(
            self.login_url,
            {"username": "tester", "password": "password-incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_pu_aut_03_cerrar_sesion(self):
        token = Token.objects.create(user=self.user)

        response = self.client.post(
            self.logout_url,
            HTTP_AUTHORIZATION=f"Token {token.key}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

        protected_response = self.client.get(
            self.protected_url,
            HTTP_AUTHORIZATION=f"Token {token.key}",
        )

        self.assertEqual(protected_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pu_aut_04_validar_campos_obligatorios_en_el_inicio_de_sesion(self):
        response = self.client.post(self.login_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertIn("password", response.data)

    def test_pu_aut_05_mantener_sesion_iniciada(self):
        login_response = self.client.post(
            self.login_url,
            {"username": "tester", "password": "test123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        token = login_response.data["token"]
        protected_response = self.client.get(
            self.protected_url,
            HTTP_AUTHORIZATION=f"Token {token}",
        )

        self.assertEqual(protected_response.status_code, status.HTTP_200_OK)


class GeneralValidationAPITestCase(APITestCase):
    def setUp(self):
        self.clients_url = "/api/clients/"
        self.budgets_url = "/api/budgets/"
        self.jobs_url = "/api/jobs/"
        self.materials_url = "/api/materials/"
        self.consumptions_url = "/api/materials/consumptions/"
        self.alerts_url = "/api/alerts/"

        User = get_user_model()
        self.user = User.objects.create_user(username="validator", password="test123")
        self.client.force_authenticate(user=self.user)

        self.customer = Client.objects.create(
            owner=self.user,
            first_name="Manuel",
            last_name="Lopez",
            phone="600000000",
            email="manuel@example.com",
            status=Client.Status.ACTIVE,
        )
        self.job = Job.objects.create(
            owner=self.user,
            client=self.customer,
            title="Pintura de salon",
            status=Job.Status.PENDING,
        )
        self.material = Material.objects.create(
            owner=self.user,
            name="Pintura blanca",
            material_type="Pintura",
            provider="Proveedor Norte",
            quantity_available=Decimal("5.00"),
            minimum_stock=Decimal("1.00"),
            unit="litros",
            unit_price=Decimal("12.50"),
        )

    def test_pu_val_01_validar_campos_obligatorios(self):
        response = self.client.post(self.clients_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)
        self.assertIn("phone", response.data)

    def test_pu_val_02_validar_formato_de_email(self):
        payload = {
            "first_name": "Laura",
            "last_name": "Sanchez",
            "phone": "611111111",
            "email": "email-no-valido",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_pu_val_03_validar_formato_de_telefono(self):
        payload = {
            "first_name": "Laura",
            "last_name": "Sanchez",
            "phone": "telefono",
            "email": "laura@example.com",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_pu_val_04_validar_importes_negativos(self):
        payload = {
            "name": "Rodillo",
            "material_type": "Herramienta",
            "provider": "Proveedor Sur",
            "quantity_available": "-1.00",
            "minimum_stock": "-1.00",
            "unit": "unidad",
            "unit_price": "-5.00",
        }

        response = self.client.post(self.materials_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity_available", response.data)
        self.assertIn("minimum_stock", response.data)
        self.assertIn("unit_price", response.data)

    def test_pu_val_05_validar_fechas_incorrectas(self):
        payload = {
            "client": self.customer.id,
            "title": "Trabajo con fechas incorrectas",
            "start_date": "2026-05-20",
            "end_date": "2026-05-18",
            "status": Job.Status.PLANNED,
        }

        response = self.client.post(self.jobs_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("La fecha de fin no puede ser anterior", str(response.data))

    def test_pu_val_06_validar_cantidades_de_material(self):
        empty_quantity_payload = {
            "job": self.job.id,
            "material": self.material.id,
            "quantity": "",
            "consumption_date": "2026-05-18",
        }
        negative_quantity_payload = {
            "job": self.job.id,
            "material": self.material.id,
            "quantity": "-1.00",
            "consumption_date": "2026-05-18",
        }
        excessive_quantity_payload = {
            "job": self.job.id,
            "material": self.material.id,
            "quantity": "10.00",
            "consumption_date": "2026-05-18",
        }

        empty_response = self.client.post(
            self.consumptions_url,
            empty_quantity_payload,
            format="json",
        )
        negative_response = self.client.post(
            self.consumptions_url,
            negative_quantity_payload,
            format="json",
        )
        excessive_response = self.client.post(
            self.consumptions_url,
            excessive_quantity_payload,
            format="json",
        )

        self.assertEqual(empty_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(negative_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(excessive_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", empty_response.data)
        self.assertIn("quantity", negative_response.data)
        self.assertIn("No hay suficiente stock", str(excessive_response.data))

    def test_pu_val_07_validar_estados_permitidos(self):
        invalid_job_response = self.client.post(
            self.jobs_url,
            {
                "client": self.customer.id,
                "title": "Trabajo con estado incorrecto",
                "status": "ESTADO_NO_VALIDO",
            },
            format="json",
        )
        invalid_budget_response = self.client.post(
            self.budgets_url,
            {
                "client": self.customer.id,
                "code": "PRE-VAL-001",
                "date": "2026-05-18",
                "status": "ESTADO_NO_VALIDO",
            },
            format="json",
        )
        invalid_alert_response = self.client.post(
            self.alerts_url,
            {
                "alert_type": "GENERAL",
                "title": "Alerta de validacion",
                "priority": "PRIORIDAD_NO_VALIDA",
            },
            format="json",
        )

        self.assertEqual(invalid_job_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_budget_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_alert_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", invalid_job_response.data)
        self.assertIn("status", invalid_budget_response.data)
        self.assertIn("priority", invalid_alert_response.data)

        valid_budget_response = self.client.post(
            self.budgets_url,
            {
                "client": self.customer.id,
                "code": "PRE-VAL-002",
                "date": "2026-05-18",
                "status": Budget.Status.PENDING,
            },
            format="json",
        )

        self.assertEqual(valid_budget_response.status_code, status.HTTP_201_CREATED)

    def test_pu_val_08_validar_textos_demasiado_largos(self):
        payload = {
            "first_name": "A" * 101,
            "last_name": "Sanchez",
            "phone": "611111111",
            "email": "laura@example.com",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)
