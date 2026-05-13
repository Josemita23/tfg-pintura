import { X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { Budget } from "../../../types/budget";
import type { Client } from "../../../types/client";
import type { Job, JobStatus } from "../../../types/job";
import "./JobFormModal.css";

export type JobFormData = {
  client: number;
  budget: number | null;
  title: string;
  description: string;
  address: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: JobStatus;
  notes: string;
};

type JobFormModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  job?: Job | null;
  clients: Client[];
  budgets: Budget[];
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
};

const initialFormData: JobFormData = {
  client: 0,
  budget: null,
  title: "",
  description: "",
  address: "",
  start_date: null,
  end_date: null,
  start_time: null,
  end_time: null,
  status: "PENDING",
  notes: "",
};

function mapJobToFormData(job: Job): JobFormData {
  return {
    client: job.client,
    budget: job.budget,
    title: job.title,
    description: job.description,
    address: job.address,
    start_date: job.start_date,
    end_date: job.end_date,
    start_time: job.start_time,
    end_time: job.end_time,
    status: job.status,
    notes: job.notes,
  };
}

export function JobFormModal({
  isOpen,
  isSaving,
  job,
  clients,
  budgets,
  onClose,
  onSubmit,
}: JobFormModalProps) {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(job);

  const selectedClientBudgets = useMemo(() => {
    return budgets.filter((budget) => budget.client === formData.client);
  }, [budgets, formData.client]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (job) {
      setFormData(mapJobToFormData(job));
    } else {
      setFormData({
        ...initialFormData,
        client: clients[0]?.id ?? 0,
      });
    }
  }, [clients, isOpen, job]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof JobFormData, value: string | number | null) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
      ...(field === "client" ? { budget: null } : {}),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.client) {
      setErrorMessage("Debes seleccionar un cliente.");
      return;
    }

    if (!formData.title.trim()) {
      setErrorMessage("El título del trabajo es obligatorio.");
      return;
    }

    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      setErrorMessage("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }

    if (
      formData.start_date &&
      formData.end_date &&
      formData.start_date === formData.end_date &&
      formData.start_time &&
      formData.end_time &&
      formData.end_time <= formData.start_time
    ) {
      setErrorMessage("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setErrorMessage("No se ha podido guardar el trabajo. Revisa los datos introducidos.");
    }
  };

  return (
    <div className="job-modal-backdrop">
      <section className="job-modal">
        <header className="job-modal__header">
          <div>
            <h2>{isEditing ? "Editar trabajo" : "Nuevo trabajo"}</h2>
            <p>
              {isEditing
                ? "Actualiza los datos del trabajo seleccionado"
                : "Registra un nuevo trabajo asociado a un cliente"}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={20} />
          </button>
        </header>

        <form className="job-form" onSubmit={handleSubmit}>
          <div className="job-form__grid">
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
              Presupuesto asociado
              <select
                value={formData.budget ?? 0}
                onChange={(event) =>
                  handleChange(
                    "budget",
                    Number(event.target.value) === 0 ? null : Number(event.target.value)
                  )
                }
              >
                <option value={0}>Sin presupuesto asociado</option>
                {selectedClientBudgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.code} - {budget.client_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="job-form__full">
              Título *
              <input
                type="text"
                value={formData.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Ej. Pintura de salón"
              />
            </label>

            <label className="job-form__full">
              Descripción
              <textarea
                value={formData.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Descripción del trabajo"
                rows={3}
              />
            </label>

            <label className="job-form__full">
              Dirección
              <input
                type="text"
                value={formData.address}
                onChange={(event) => handleChange("address", event.target.value)}
                placeholder="Dirección del trabajo"
              />
            </label>

            <label>
              Fecha inicio
              <input
                type="date"
                value={formData.start_date ?? ""}
                onChange={(event) => handleChange("start_date", event.target.value || null)}
              />
            </label>

            <label>
              Fecha fin
              <input
                type="date"
                value={formData.end_date ?? ""}
                onChange={(event) => handleChange("end_date", event.target.value || null)}
              />
            </label>

            <label>
              Hora inicio
              <input
                type="time"
                value={formData.start_time?.slice(0, 5) ?? ""}
                onChange={(event) =>
                  handleChange("start_time", event.target.value ? `${event.target.value}:00` : null)
                }
              />
            </label>

            <label>
              Hora fin
              <input
                type="time"
                value={formData.end_time?.slice(0, 5) ?? ""}
                onChange={(event) =>
                  handleChange("end_time", event.target.value ? `${event.target.value}:00` : null)
                }
              />
            </label>

            <label>
              Estado
              <select
                value={formData.status}
                onChange={(event) => handleChange("status", event.target.value as JobStatus)}
              >
                <option value="PENDING">Pendiente</option>
                <option value="PLANNED">Planificado</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="FINISHED">Finalizado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>

            <label className="job-form__full">
              Observaciones
              <textarea
                value={formData.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Notas internas sobre el trabajo"
                rows={3}
              />
            </label>
          </div>

          {errorMessage && <p className="job-form__error">{errorMessage}</p>}

          <footer className="job-form__actions">
            <button className="job-form__secondary" type="button" onClick={onClose}>
              Cancelar
            </button>

            <button className="job-form__primary" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar trabajo"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}