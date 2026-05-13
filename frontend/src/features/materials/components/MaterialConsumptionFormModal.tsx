import { X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Job } from "../../../types/job";
import type {
  Material,
  MaterialConsumption,
  MaterialConsumptionPayload,
} from "../../../types/material";
import "./MaterialConsumptionFormModal.css";

type MaterialConsumptionFormModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  consumption?: MaterialConsumption | null;
  jobs: Job[];
  materials: Material[];
  onClose: () => void;
  onSubmit: (data: MaterialConsumptionPayload) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

const initialFormData: MaterialConsumptionPayload = {
  job: 0,
  material: 0,
  quantity: "1",
  consumption_date: today,
  notes: "",
};

function parseNumber(value: string) {
  return Number(String(value).replace(",", ".")) || 0;
}

export function MaterialConsumptionFormModal({
  isOpen,
  isSaving,
  consumption,
  jobs,
  materials,
  onClose,
  onSubmit,
}: MaterialConsumptionFormModalProps) {
  const [formData, setFormData] =
    useState<MaterialConsumptionPayload>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(consumption);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (consumption) {
      setFormData({
        job: consumption.job,
        material: consumption.material,
        quantity: consumption.quantity,
        consumption_date: consumption.consumption_date,
        notes: consumption.notes,
      });
    } else {
      setFormData({
        ...initialFormData,
        job: jobs[0]?.id ?? 0,
        material: materials[0]?.id ?? 0,
      });
    }
  }, [isOpen, consumption, jobs, materials]);

  const selectedMaterial = useMemo(() => {
    return materials.find((material) => material.id === formData.material);
  }, [materials, formData.material]);

  const availableStock = selectedMaterial
    ? parseNumber(selectedMaterial.quantity_available)
    : 0;

  const selectedUnit = selectedMaterial?.unit ?? "unidad";

  if (!isOpen) {
    return null;
  }

  function handleChange(
    field: keyof MaterialConsumptionPayload,
    value: string | number
  ) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.job) {
      setErrorMessage("Debes seleccionar un trabajo.");
      return;
    }

    if (!formData.material) {
      setErrorMessage("Debes seleccionar un material.");
      return;
    }

    if (parseNumber(formData.quantity) <= 0) {
      setErrorMessage("La cantidad consumida debe ser mayor que cero.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setErrorMessage(
        "No se ha podido guardar el consumo. Revisa que haya stock suficiente."
      );
    }
  }

  return (
    <div className="material-consumption-backdrop">
      <section className="material-consumption-modal card">
        <header className="material-consumption-form__header">
          <div>
            <h2>{isEditing ? "Editar consumo" : "Registrar consumo"}</h2>
            <p>
              Asocia materiales consumidos a un trabajo para actualizar el
              inventario
            </p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form className="material-consumption-form" onSubmit={handleSubmit}>
          <label>
            Trabajo *
            <select
              value={formData.job}
              onChange={(event) =>
                handleChange("job", Number(event.target.value))
              }
            >
              <option value={0}>Selecciona un trabajo</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.client_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Material *
            <select
              value={formData.material}
              onChange={(event) =>
                handleChange("material", Number(event.target.value))
              }
            >
              <option value={0}>Selecciona un material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.quantity_available}{" "}
                  {material.unit})
                </option>
              ))}
            </select>
          </label>

          {selectedMaterial && (
            <div className="material-consumption-form__stock">
              <span>Stock disponible</span>
              <strong>
                {availableStock.toLocaleString("es-ES")} {selectedUnit}
              </strong>
            </div>
          )}

          <div className="material-consumption-form__row">
            <label>
              Cantidad consumida *
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(event) =>
                  handleChange("quantity", event.target.value)
                }
              />
            </label>

            <label>
              Fecha de consumo *
              <input
                type="date"
                value={formData.consumption_date}
                onChange={(event) =>
                  handleChange("consumption_date", event.target.value)
                }
              />
            </label>
          </div>

          <label>
            Observaciones
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              placeholder="Ej. Usado para pintar salón y pasillo"
            />
          </label>

          {errorMessage && (
            <p className="material-consumption-form__error">{errorMessage}</p>
          )}

          <footer className="material-consumption-form__actions">
            <button
              className="material-consumption-form__secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="material-consumption-form__primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Registrar consumo"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}