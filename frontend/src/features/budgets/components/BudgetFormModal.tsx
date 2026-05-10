import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import type { Budget, BudgetStatus } from "../../../types/budget";
import type { Client } from "../../../types/client";
import "./BudgetFormModal.css";

export type BudgetFormData = {
  client: number;
  code: string;
  description: string;
  date: string;
  status: BudgetStatus;
  vat_percentage: string;
  notes: string;
};

type BudgetFormModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  budget?: Budget | null;
  clients: Client[];
  onClose: () => void;
  onSubmit: (data: BudgetFormData) => Promise<void>;
};

const initialFormData: BudgetFormData = {
  client: 0,
  code: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  status: "DRAFT",
  vat_percentage: "21.00",
  notes: "",
};

function mapBudgetToFormData(budget: Budget): BudgetFormData {
  return {
    client: budget.client,
    code: budget.code,
    description: budget.description,
    date: budget.date,
    status: budget.status,
    vat_percentage: budget.vat_percentage,
    notes: budget.notes,
  };
}

export function BudgetFormModal({
  isOpen,
  isSaving,
  budget,
  clients,
  onClose,
  onSubmit,
}: BudgetFormModalProps) {
  const [formData, setFormData] = useState<BudgetFormData>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(budget);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (budget) {
      setFormData(mapBudgetToFormData(budget));
    } else {
      setFormData({
        ...initialFormData,
        client: clients[0]?.id ?? 0,
      });
    }
  }, [budget, clients, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof BudgetFormData, value: string | number) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.client) {
      setErrorMessage("Debes seleccionar un cliente.");
      return;
    }

    if (!formData.code.trim()) {
      setErrorMessage("El código del presupuesto es obligatorio.");
      return;
    }

    if (!formData.date) {
      setErrorMessage("La fecha del presupuesto es obligatoria.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setErrorMessage("No se ha podido guardar el presupuesto. Revisa los datos.");
    }
  };

  return (
    <div className="budget-modal-backdrop">
      <section className="budget-modal">
        <header className="budget-modal__header">
          <div>
            <h2>{isEditing ? "Editar presupuesto" : "Nuevo presupuesto"}</h2>
            <p>
              {isEditing
                ? "Actualiza los datos generales del presupuesto"
                : "Registra un presupuesto asociado a un cliente"}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={20} />
          </button>
        </header>

        <form className="budget-form" onSubmit={handleSubmit}>
          <div className="budget-form__grid">
            <label>
              Cliente *
              <select
                value={formData.client}
                onChange={(event) => handleChange("client", Number(event.target.value))}
              >
                <option value={0}>Selecciona un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Código *
              <input
                type="text"
                value={formData.code}
                onChange={(event) => handleChange("code", event.target.value)}
                placeholder="Ej. PRE-001"
              />
            </label>

            <label>
              Fecha *
              <input
                type="date"
                value={formData.date}
                onChange={(event) => handleChange("date", event.target.value)}
              />
            </label>

            <label>
              Estado
              <select
                value={formData.status}
                onChange={(event) => handleChange("status", event.target.value as BudgetStatus)}
              >
                <option value="DRAFT">Borrador</option>
                <option value="PENDING">Pendiente</option>
                <option value="ACCEPTED">Aceptado</option>
                <option value="REJECTED">Rechazado</option>
                <option value="CONVERTED">Convertido</option>
              </select>
            </label>

            <label>
              IVA (%)
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.vat_percentage}
                onChange={(event) => handleChange("vat_percentage", event.target.value)}
              />
            </label>

            <label className="budget-form__full">
              Descripción
              <textarea
                value={formData.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Descripción general del presupuesto"
                rows={3}
              />
            </label>

            <label className="budget-form__full">
              Observaciones
              <textarea
                value={formData.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Notas internas"
                rows={3}
              />
            </label>
          </div>

          {errorMessage && <p className="budget-form__error">{errorMessage}</p>}

          <footer className="budget-form__actions">
            <button className="budget-form__secondary" type="button" onClick={onClose}>
              Cancelar
            </button>

            <button className="budget-form__primary" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar presupuesto"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}