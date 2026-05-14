from .models import Alert


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
        material=material,
        **alert_data,
    )


def generate_stock_alerts_for_all_materials():
    from materials.models import Material

    materials = Material.objects.filter(
        status__in=[
            Material.Status.LOW_STOCK,
            Material.Status.OUT_OF_STOCK,
        ]
    )

    generated_alerts = []

    for material in materials:
        alert = sync_stock_alert_for_material(material)

        if alert:
            generated_alerts.append(alert)

    return generated_alerts