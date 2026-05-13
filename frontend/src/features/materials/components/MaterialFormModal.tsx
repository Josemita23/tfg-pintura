import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Material, MaterialPayload } from "../../../types/material";
import "./MaterialFormModal.css";

type MaterialFormModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  material?: Material | null;
  onClose: () => void;
  onSubmit: (data: MaterialPayload) => Promise<void>;
};

const initialFormData: MaterialPayload = {
  name: "",
  material_type: "",
  provider: "",
  quantity_available: "0",
  minimum_stock: "0",
  unit: "unidad",
  unit_price: "0",
  notes: "",
};

function mapMaterialToFormData(material: Material): MaterialPayload {
  return {
    name: material.name,
    material_type: material.material_type,
    provider: material.provider,
    quantity_available: material.quantity_available,
    minimum_stock: material.minimum_stock,
    unit: material.unit,
    unit_price: material.unit_price,
    notes: material.notes,
  };
}

export function MaterialFormModal({
  isOpen,
  isSaving,
  material,
  onClose,
  onSubmit,
}: MaterialFormModalProps) {
  const [formData, setFormData] = useState<MaterialPayload>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(material);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (material) {
      setFormData(mapMaterialToFormData(material));
    } else {
      setFormData(initialFormData);
    }
  }, [isOpen, material]);

  if (!isOpen) {
    return null;
  }

  function handleChange(field: keyof MaterialPayload, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.name.trim()) {
      setErrorMessage("El nombre del material es obligatorio.");
      return;
    }

    if (Number(formData.quantity_available) < 0) {
      setErrorMessage("La cantidad disponible no puede ser negativa.");
      return;
    }

    if (Number(formData.minimum_stock) < 0) {
      setErrorMessage("El stock mínimo no puede ser negativo.");
      return;
    }

    if (Number(formData.unit_price) < 0) {
      setErrorMessage("El precio unitario no puede ser negativo.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setErrorMessage("No se ha podido guardar el material. Revisa los datos introducidos.");
    }
  }

  return (
    <div className="material-form-backdrop">
      <section className="material-form-modal card">
        <header className="material-form__header">
          <div>
            <h2>{isEditing ? "Editar material" : "Nuevo material"}</h2>
            <p>
              {isEditing
                ? "Actualiza los datos del material seleccionado"
                : "Registra un nuevo material en el inventario"}
            </p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form className="material-form" onSubmit={handleSubmit}>
          <div className="material-form__grid">
            <label>
              Nombre *
              <input
                type="text"
                value={formData.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Ej. Pintura blanca mate"
              />
            </label>

            <label>
              Tipo
              <input
                type="text"
                value={formData.material_type}
                onChange={(event) =>
                  handleChange("material_type", event.target.value)
                }
                placeholder="Ej. Pintura, herramienta..."
              />
            </label>

            <label>
              Proveedor
              <input
                type="text"
                value={formData.provider}
                onChange={(event) =>
                  handleChange("provider", event.target.value)
                }
                placeholder="Ej. Leroy Merlin"
              />
            </label>

            <label>
              Unidad
              <input
                type="text"
                value={formData.unit}
                onChange={(event) => handleChange("unit", event.target.value)}
                placeholder="Ej. litros, kg, unidad"
              />
            </label>

            <label>
              Cantidad disponible
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity_available}
                onChange={(event) =>
                  handleChange("quantity_available", event.target.value)
                }
              />
            </label>

            <label>
              Stock mínimo
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minimum_stock}
                onChange={(event) =>
                  handleChange("minimum_stock", event.target.value)
                }
              />
            </label>

            <label>
              Precio unitario
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(event) =>
                  handleChange("unit_price", event.target.value)
                }
              />
            </label>

            <label className="material-form__full">
              Observaciones
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Notas internas sobre el material"
              />
            </label>
          </div>

          {errorMessage && <p className="material-form__error">{errorMessage}</p>}

          <footer className="material-form__actions">
            <button
              className="material-form__secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="material-form__primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar material"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}