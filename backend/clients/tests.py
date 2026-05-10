from rest_framework import status
from rest_framework.test import APITestCase

from .models import Client


class ClientAPITestCase(APITestCase):
    def setUp(self):
        self.clients_url = "/api/clients/"

        self.client_one = Client.objects.create(
            first_name="Manuel",
            last_name="López",
            phone="600000000",
            email="manuel@example.com",
            address="Sevilla",
            notes="Cliente habitual",
            status=Client.Status.ACTIVE,
        )

        self.client_two = Client.objects.create(
            first_name="Carmen",
            last_name="Ruiz",
            phone="611111111",
            email="carmen@example.com",
            address="Dos Hermanas",
            notes="Cliente potencial",
            status=Client.Status.POTENTIAL,
        )

    def test_pu_cli_01_consultar_lista_de_clientes(self):
        response = self.client.get(self.clients_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        client_names = [client["full_name"] for client in response.data]

        self.assertIn("Manuel López", client_names)
        self.assertIn("Carmen Ruiz", client_names)

    def test_pu_cli_02_buscar_cliente_por_nombre_telefono_o_email(self):
        response_by_name = self.client.get(self.clients_url, {"search": "Manuel"})
        self.assertEqual(response_by_name.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_name.data), 1)
        self.assertEqual(response_by_name.data[0]["full_name"], "Manuel López")

        response_by_phone = self.client.get(self.clients_url, {"search": "611111111"})
        self.assertEqual(response_by_phone.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_phone.data), 1)
        self.assertEqual(response_by_phone.data[0]["full_name"], "Carmen Ruiz")

        response_by_email = self.client.get(self.clients_url, {"search": "manuel@example.com"})
        self.assertEqual(response_by_email.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_by_email.data), 1)
        self.assertEqual(response_by_email.data[0]["full_name"], "Manuel López")

    def test_pu_cli_03_crear_cliente_con_email_o_telefono_ya_registrado(self):
        duplicated_phone_payload = {
            "first_name": "Pedro",
            "last_name": "Gómez",
            "phone": "600000000",
            "email": "pedro@example.com",
            "address": "Sevilla",
            "notes": "",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, duplicated_phone_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Client.objects.count(), 2)

        duplicated_email_payload = {
            "first_name": "Laura",
            "last_name": "Sánchez",
            "phone": "622222222",
            "email": "manuel@example.com",
            "address": "Sevilla",
            "notes": "",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, duplicated_email_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Client.objects.count(), 2)

    def test_pu_cli_04_ver_detalle_de_un_cliente(self):
        response = self.client.get(f"{self.clients_url}{self.client_one.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.client_one.id)
        self.assertEqual(response.data["first_name"], "Manuel")
        self.assertEqual(response.data["last_name"], "López")
        self.assertEqual(response.data["full_name"], "Manuel López")
        self.assertEqual(response.data["phone"], "600000000")
        self.assertEqual(response.data["email"], "manuel@example.com")

    def test_pu_cli_05_crear_nuevo_cliente_con_datos_correctos(self):
        payload = {
            "first_name": "Pedro",
            "last_name": "Jiménez",
            "phone": "622222222",
            "email": "pedro@example.com",
            "address": "Calle Feria, Sevilla",
            "notes": "Cliente creado desde test",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Client.objects.count(), 3)

        created_client = Client.objects.get(phone="622222222")

        self.assertEqual(created_client.first_name, "Pedro")
        self.assertEqual(created_client.last_name, "Jiménez")
        self.assertEqual(created_client.email, "pedro@example.com")
        self.assertEqual(created_client.status, Client.Status.ACTIVE)

    def test_pu_cli_06_crear_nuevo_cliente_con_datos_incorrectos(self):
        payload = {
            "first_name": "",
            "last_name": "Sin nombre",
            "phone": "",
            "email": "email-no-valido",
            "address": "Sevilla",
            "notes": "",
            "status": Client.Status.ACTIVE,
        }

        response = self.client.post(self.clients_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Client.objects.count(), 2)

        self.assertIn("first_name", response.data)
        self.assertIn("phone", response.data)
        self.assertIn("email", response.data)

    def test_pu_cli_07_editar_un_cliente_existente(self):
        payload = {
            "first_name": "Manuel Actualizado",
            "phone": "633333333",
            "address": "Nueva dirección, Sevilla",
            "status": Client.Status.INACTIVE,
        }

        response = self.client.patch(
            f"{self.clients_url}{self.client_one.id}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client_one.refresh_from_db()

        self.assertEqual(self.client_one.first_name, "Manuel Actualizado")
        self.assertEqual(self.client_one.phone, "633333333")
        self.assertEqual(self.client_one.address, "Nueva dirección, Sevilla")
        self.assertEqual(self.client_one.status, Client.Status.INACTIVE)