from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client

from .models import Budget, BudgetItem


class BudgetAPITestCase(APITestCase):
    def setUp(self):
        self.budgets_url = "/api/budgets/"
        self.items_url = "/api/budgets/items/"

        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="test123")
        self.client.force_authenticate(user=self.user)

        self.customer = Client.objects.create(
            owner=self.user,
            first_name="Manuel",
            last_name="Lopez",
            phone="600000000",
            email="manuel@example.com",
            address="Sevilla",
            status=Client.Status.ACTIVE,
        )

        self.budget_one = Budget.objects.create(
            owner=self.user,
            client=self.customer,
            code="PRE-001",
            description="Pintura de salon",
            date=date(2026, 5, 18),
            status=Budget.Status.DRAFT,
            vat_percentage=Decimal("21.00"),
        )
        self.budget_two = Budget.objects.create(
            owner=self.user,
            client=self.customer,
            code="PRE-002",
            description="Pintura de dormitorio",
            date=date(2026, 5, 19),
            status=Budget.Status.PENDING,
            vat_percentage=Decimal("21.00"),
        )

        self.item_one = BudgetItem.objects.create(
            budget=self.budget_one,
            description="Pintar paredes",
            quantity=Decimal("10.00"),
            unit="m2",
            unit_price=Decimal("8.00"),
        )

    def test_pu_pre_01_consultar_lista_de_presupuestos(self):
        response = self.client.get(self.budgets_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        budget_codes = [budget["code"] for budget in response.data]

        self.assertIn("PRE-001", budget_codes)
        self.assertIn("PRE-002", budget_codes)

    def test_pu_pre_02_ver_detalle_de_un_presupuesto(self):
        response = self.client.get(f"{self.budgets_url}{self.budget_one.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.budget_one.id)
        self.assertEqual(response.data["code"], "PRE-001")
        self.assertEqual(response.data["description"], "Pintura de salon")
        self.assertEqual(response.data["client"], self.customer.id)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["description"], "Pintar paredes")

    def test_pu_pre_03_crear_presupuesto_con_datos_correctos(self):
        payload = {
            "client": self.customer.id,
            "code": "PRE-003",
            "description": "Pintura de cocina",
            "date": "2026-05-20",
            "status": Budget.Status.DRAFT,
            "vat_percentage": "21.00",
            "notes": "Presupuesto creado desde test",
        }

        response = self.client.post(self.budgets_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Budget.objects.count(), 3)

        created_budget = Budget.objects.get(code="PRE-003")

        self.assertEqual(created_budget.owner, self.user)
        self.assertEqual(created_budget.client, self.customer)
        self.assertEqual(created_budget.description, "Pintura de cocina")
        self.assertEqual(created_budget.subtotal, Decimal("0.00"))

    def test_pu_pre_04_crear_presupuesto_con_datos_incorrectos(self):
        payload = {
            "client": self.customer.id,
            "code": "",
            "description": "Presupuesto incorrecto",
            "date": "fecha-no-valida",
            "status": "NO_VALIDO",
            "vat_percentage": "21.00",
        }

        response = self.client.post(self.budgets_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Budget.objects.count(), 2)
        self.assertIn("code", response.data)
        self.assertIn("date", response.data)
        self.assertIn("status", response.data)

    def test_pu_pre_05_anadir_concepto_al_presupuesto(self):
        payload = {
            "budget": self.budget_two.id,
            "description": "Pintar techo",
            "quantity": "5.00",
            "unit": "m2",
            "unit_price": "9.00",
        }

        response = self.client.post(self.items_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["amount"], "45.00")

        self.budget_two.refresh_from_db()

        self.assertEqual(self.budget_two.items.count(), 1)
        self.assertEqual(self.budget_two.subtotal, Decimal("45.00"))
        self.assertEqual(self.budget_two.vat_amount, Decimal("9.45"))
        self.assertEqual(self.budget_two.total, Decimal("54.45"))

    def test_pu_pre_06_eliminar_concepto_del_presupuesto(self):
        second_item = BudgetItem.objects.create(
            budget=self.budget_one,
            description="Pintar techo",
            quantity=Decimal("5.00"),
            unit="m2",
            unit_price=Decimal("9.00"),
        )

        self.budget_one.refresh_from_db()
        self.assertEqual(self.budget_one.subtotal, Decimal("125.00"))

        response = self.client.delete(f"{self.items_url}{second_item.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.budget_one.refresh_from_db()

        self.assertFalse(BudgetItem.objects.filter(id=second_item.id).exists())
        self.assertEqual(self.budget_one.subtotal, Decimal("80.00"))
        self.assertEqual(self.budget_one.vat_amount, Decimal("16.80"))
        self.assertEqual(self.budget_one.total, Decimal("96.80"))

    def test_pu_pre_07_calcular_subtotal(self):
        BudgetItem.objects.create(
            budget=self.budget_one,
            description="Pintar techo",
            quantity=Decimal("5.00"),
            unit="m2",
            unit_price=Decimal("9.00"),
        )

        self.budget_one.refresh_from_db()

        self.assertEqual(self.budget_one.subtotal, Decimal("125.00"))

    def test_pu_pre_08_calcular_iva(self):
        self.budget_one.refresh_from_db()

        self.assertEqual(self.budget_one.subtotal, Decimal("80.00"))
        self.assertEqual(self.budget_one.vat_amount, Decimal("16.80"))

    def test_pu_pre_09_calcular_total(self):
        self.budget_one.refresh_from_db()

        self.assertEqual(self.budget_one.subtotal, Decimal("80.00"))
        self.assertEqual(self.budget_one.vat_amount, Decimal("16.80"))
        self.assertEqual(self.budget_one.total, Decimal("96.80"))

    def test_pu_pre_10_editar_presupuesto_pendiente(self):
        payload = {
            "description": "Pintura de dormitorio actualizada",
            "date": "2026-05-21",
            "notes": "Cliente solicita pintura antihumedad",
        }

        response = self.client.patch(
            f"{self.budgets_url}{self.budget_two.id}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.budget_two.refresh_from_db()

        self.assertEqual(self.budget_two.description, "Pintura de dormitorio actualizada")
        self.assertEqual(self.budget_two.date, date(2026, 5, 21))
        self.assertEqual(self.budget_two.notes, "Cliente solicita pintura antihumedad")

    def test_pu_pre_11_aceptar_presupuesto(self):
        response = self.client.patch(
            f"{self.budgets_url}{self.budget_two.id}/",
            {"status": Budget.Status.ACCEPTED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Budget.Status.ACCEPTED)

        self.budget_two.refresh_from_db()

        self.assertEqual(self.budget_two.status, Budget.Status.ACCEPTED)

    def test_pu_pre_12_eliminar_presupuesto_pendiente(self):
        response = self.client.delete(f"{self.budgets_url}{self.budget_two.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Budget.objects.filter(id=self.budget_two.id).exists())
