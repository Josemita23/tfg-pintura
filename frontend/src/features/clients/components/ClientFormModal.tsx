import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import type { Client, ClientStatus } from "../../../types/client";
import "./ClientFormModal.css";

export type ClientFormData = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  status: ClientStatus;
};

type ClientFormModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  client?: Client | null;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
};

const initialFormData: ClientFormData = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "ACTIVE",
};

function mapClientToFormData(client: Client): ClientFormData {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    phone: client.phone,
    email: client.email ?? "",
    address: client.address,
    notes: client.notes,
    status: client.status,
  };
}

export function ClientFormModal({
  isOpen,
  isSaving,
  client,
  onClose,
  onSubmit,
}: ClientFormModalProps) {
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(client);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (client) {
      setFormData(mapClientToFormData(client));
    } else {
      setFormData(initialFormData);
    }
  }, [client, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!formData.first_name.trim()) {
      setErrorMessage("El nombre del cliente es obligatorio.");
      return;
    }

    if (!formData.phone.trim()) {
      setErrorMessage("El teléfono del cliente es obligatorio.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setErrorMessage("No se ha podido guardar el cliente. Revisa los datos introducidos.");
    }
  };

  return (
    <div className="client-modal-backdrop">
      <section className="client-modal">
        <header className="client-modal__header">
          <div>
            <h2>{isEditing ? "Editar cliente" : "Nuevo cliente"}</h2>
            <p>
              {isEditing
                ? "Actualiza los datos principales del cliente"
                : "Registra los datos principales del cliente"}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Cerrar formulario">
            <X size={20} />
          </button>
        </header>

        <form className="client-form" onSubmit={handleSubmit}>
          <div className="client-form__grid">
            <label>
              Nombre *
              <input
                type="text"
                value={formData.first_name}
                onChange={(event) => handleChange("first_name", event.target.value)}
                placeholder="Ej. Manuel"
              />
            </label>

            <label>
              Apellidos
              <input
                type="text"
                value={formData.last_name}
                onChange={(event) => handleChange("last_name", event.target.value)}
                placeholder="Ej. López"
              />
            </label>

            <label>
              Teléfono *
              <input
                type="text"
                value={formData.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                placeholder="Ej. 600000000"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={formData.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="cliente@email.com"
              />
            </label>

            <label className="client-form__full">
              Dirección
              <input
                type="text"
                value={formData.address}
                onChange={(event) => handleChange("address", event.target.value)}
                placeholder="Dirección del cliente"
              />
            </label>

            <label>
              Estado
              <select
                value={formData.status}
                onChange={(event) => handleChange("status", event.target.value as ClientStatus)}
              >
                <option value="ACTIVE">Activo</option>
                <option value="POTENTIAL">Potencial</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </label>

            <label className="client-form__full">
              Observaciones
              <textarea
                value={formData.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                placeholder="Notas internas sobre el cliente"
                rows={4}
              />
            </label>
          </div>

          {errorMessage && <p className="client-form__error">{errorMessage}</p>}

          <footer className="client-form__actions">
            <button className="client-form__secondary" type="button" onClick={onClose}>
              Cancelar
            </button>

            <button className="client-form__primary" type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar cliente"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}