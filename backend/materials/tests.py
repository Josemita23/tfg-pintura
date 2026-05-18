from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Material


class MaterialAPITestCase(APITestCase):
    def setUp(self):
        self.materials_url = "/api/materials/"

        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="test123")
        self.client.force_authenticate(user=self.user)

        self.material_one = Material.objects.create(
            owner=self.user,
            name="Pintura blanca",
            material_type="Pintura plastica",
            provider="Proveedor Norte",
            quantity_available=Decimal("20.00"),
            minimum_stock=Decimal("5.00"),
            unit="litros",
            unit_price=Decimal("12.50"),
            notes="Uso interior",
        )
        self.material_two = Material.objects.create(
            owner=self.user,
            name="Rodillo antigoteo",
            material_type="Herramienta",
            provider="Proveedor Sur",
            quantity_available=Decimal("2.00"),
            minimum_stock=Decimal("5.00"),
            unit="unidad",
            unit_price=Decimal("6.00"),
            notes="Stock bajo",
        )

    def test_pu_mat_01_consultar_lista_de_materiales(self):
        response = self.client.get(self.materials_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        material_names = [material["name"] for material in response.data]

        self.assertIn("Pintura blanca", material_names)
        self.assertIn("Rodillo antigoteo", material_names)

    def test_pu_mat_02_buscar_material_por_nombre_tipo_proveedor_o_estado(self):
        response_by_name = self.client.get(self.materials_url, {"search": "Pintura blanca"})
        self.assertEqual(response_by_name.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_name.data), 1)
        self.assertEqual(response_by_name.data[0]["name"], "Pintura blanca")

        response_by_type = self.client.get(self.materials_url, {"search": "Herramienta"})
        self.assertEqual(response_by_type.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_type.data), 1)
        self.assertEqual(response_by_type.data[0]["name"], "Rodillo antigoteo")

        response_by_provider = self.client.get(self.materials_url, {"search": "Proveedor Norte"})
        self.assertEqual(response_by_provider.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_provider.data), 1)
        self.assertEqual(response_by_provider.data[0]["name"], "Pintura blanca")

        response_by_status = self.client.get(
            self.materials_url,
            {"status": Material.Status.LOW_STOCK},
        )
        self.assertEqual(response_by_status.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_status.data), 1)
        self.assertEqual(response_by_status.data[0]["name"], "Rodillo antigoteo")

    def test_pu_mat_03_ver_detalle_de_un_material(self):
        response = self.client.get(f"{self.materials_url}{self.material_one.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.material_one.id)
        self.assertEqual(response.data["name"], "Pintura blanca")
        self.assertEqual(response.data["material_type"], "Pintura plastica")
        self.assertEqual(response.data["provider"], "Proveedor Norte")
        self.assertEqual(response.data["quantity_available"], "20.00")
        self.assertEqual(response.data["minimum_stock"], "5.00")
        self.assertEqual(response.data["unit"], "litros")
        self.assertEqual(response.data["unit_price"], "12.50")
        self.assertEqual(response.data["status"], Material.Status.AVAILABLE)

    def test_pu_mat_04_crear_material_con_datos_correctos(self):
        payload = {
            "name": "Cinta de carrocero",
            "material_type": "Consumible",
            "provider": "Proveedor Centro",
            "quantity_available": "15.00",
            "minimum_stock": "3.00",
            "unit": "rollo",
            "unit_price": "2.50",
            "notes": "Para remates",
        }

        response = self.client.post(self.materials_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Material.objects.count(), 3)

        created_material = Material.objects.get(name="Cinta de carrocero")

        self.assertEqual(created_material.owner, self.user)
        self.assertEqual(created_material.material_type, "Consumible")
        self.assertEqual(created_material.provider, "Proveedor Centro")
        self.assertEqual(created_material.quantity_available, Decimal("15.00"))
        self.assertEqual(created_material.status, Material.Status.AVAILABLE)

    def test_pu_mat_05_crear_material_con_datos_incorrectos(self):
        payload = {
            "name": "",
            "material_type": "Pintura",
            "provider": "Proveedor Norte",
            "quantity_available": "-1.00",
            "minimum_stock": "-5.00",
            "unit": "litros",
            "unit_price": "-2.00",
            "notes": "",
        }

        response = self.client.post(self.materials_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Material.objects.count(), 2)
        self.assertIn("name", response.data)
        self.assertIn("quantity_available", response.data)
        self.assertIn("minimum_stock", response.data)
        self.assertIn("unit_price", response.data)

    def test_pu_mat_06_editar_material_existente(self):
        payload = {
            "name": "Pintura blanca mate",
            "provider": "Proveedor Actualizado",
            "quantity_available": "30.00",
            "unit_price": "13.25",
            "notes": "Uso interior actualizado",
        }

        response = self.client.patch(
            f"{self.materials_url}{self.material_one.id}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.material_one.refresh_from_db()

        self.assertEqual(self.material_one.name, "Pintura blanca mate")
        self.assertEqual(self.material_one.provider, "Proveedor Actualizado")
        self.assertEqual(self.material_one.quantity_available, Decimal("30.00"))
        self.assertEqual(self.material_one.unit_price, Decimal("13.25"))
        self.assertEqual(self.material_one.notes, "Uso interior actualizado")

    def test_pu_mat_07_detectar_material_con_stock_bajo(self):
        self.assertEqual(self.material_two.status, Material.Status.LOW_STOCK)

        response = self.client.get(self.materials_url, {"status": Material.Status.LOW_STOCK})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.material_two.id)
        self.assertEqual(response.data[0]["status"], Material.Status.LOW_STOCK)

