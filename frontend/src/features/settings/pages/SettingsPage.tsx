import { Bell, Building2, Check, Clock, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import "../styles/SettingsPage.css";

type SettingsFormData = {
  professionalName: string;
  role: string;
  phone: string;
  email: string;
  businessName: string;
  taxId: string;
  address: string;
  defaultStartTime: string;
  defaultEndTime: string;
  lowStockThreshold: string;
  upcomingJobDays: string;
};

const storageKey = "pintura-plus-settings";

const defaultSettings: SettingsFormData = {
  professionalName: "Manuel Lopez",
  role: "Profesional",
  phone: "",
  email: "",
  businessName: "Pintura+",
  taxId: "",
  address: "",
  defaultStartTime: "09:00",
  defaultEndTime: "18:00",
  lowStockThreshold: "5",
  upcomingJobDays: "3",
};

function loadSettings() {
  const storedSettings = window.localStorage.getItem(storageKey);

  if (!storedSettings) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...(JSON.parse(storedSettings) as Partial<SettingsFormData>),
    };
  } catch {
    return defaultSettings;
  }
}

export function SettingsPage() {
  const [formData, setFormData] = useState<SettingsFormData>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setFormData(loadSettings());
  }, []);

  const initials = useMemo(() => {
    const words = formData.professionalName.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return "PP";
    }

    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  }, [formData.professionalName]);

  function updateField(field: keyof SettingsFormData, value: string) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
    setSavedMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    window.localStorage.setItem(storageKey, JSON.stringify(formData));
    setSavedMessage("Configuracion guardada correctamente.");
  }

  function handleReset() {
    setFormData(defaultSettings);
    window.localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
    setSavedMessage("Configuracion restablecida.");
  }

  return (
    <section className="settings-page">
      <div className="page-header settings-page__header">
        <div>
          <h1 className="page-header__title">Configuracion</h1>
          <p className="page-header__subtitle">
            Datos basicos del profesional y preferencias generales de la aplicacion
          </p>
        </div>
      </div>

      <form className="settings-layout" onSubmit={handleSubmit}>
        <aside className="card settings-profile">
          <div className="settings-profile__avatar">{initials}</div>
          <h2>{formData.professionalName || "Profesional"}</h2>
          <p>{formData.role || "Rol sin definir"}</p>

          <div className="settings-profile__meta">
            <span>{formData.businessName || "Sin nombre comercial"}</span>
            <span>{formData.email || "Email no indicado"}</span>
            <span>{formData.phone || "Telefono no indicado"}</span>
          </div>
        </aside>

        <div className="settings-content">
          <section className="card settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Perfil profesional</h2>
                <p>Informacion visible para identificar al usuario principal.</p>
              </div>
              <UserRound size={20} />
            </div>

            <div className="settings-form-grid">
              <label>
                Nombre del profesional
                <input
                  type="text"
                  value={formData.professionalName}
                  onChange={(event) => updateField("professionalName", event.target.value)}
                />
              </label>

              <label>
                Rol
                <input
                  type="text"
                  value={formData.role}
                  onChange={(event) => updateField("role", event.target.value)}
                />
              </label>

              <label>
                Telefono
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="card settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Datos del negocio</h2>
                <p>Datos de referencia para presupuestos, facturacion y contacto.</p>
              </div>
              <Building2 size={20} />
            </div>

            <div className="settings-form-grid">
              <label>
                Nombre comercial
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(event) => updateField("businessName", event.target.value)}
                />
              </label>

              <label>
                NIF/CIF
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(event) => updateField("taxId", event.target.value)}
                />
              </label>

              <label className="settings-form-grid__full">
                Direccion
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="card settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Preferencias</h2>
                <p>Valores por defecto para la organizacion diaria.</p>
              </div>
              <Bell size={20} />
            </div>

            <div className="settings-preferences">
              <label>
                <span className="settings-preferences__title">
                  <Clock size={18} />
                  Horario habitual
                </span>

                <div className="settings-preferences__controls">
                  <input
                    type="time"
                    value={formData.defaultStartTime}
                    onChange={(event) => updateField("defaultStartTime", event.target.value)}
                  />
                  <input
                    type="time"
                    value={formData.defaultEndTime}
                    onChange={(event) => updateField("defaultEndTime", event.target.value)}
                  />
                </div>
              </label>

              <label>
                <span className="settings-preferences__title">
                  <Bell size={18} />
                  Avisar trabajos proximos
                </span>

                <div className="settings-preferences__controls">
                  <input
                    min="1"
                    type="number"
                    value={formData.upcomingJobDays}
                    onChange={(event) => updateField("upcomingJobDays", event.target.value)}
                  />
                  <small>dias antes</small>
                </div>
              </label>

              <label>
                <span className="settings-preferences__title">
                  <Check size={18} />
                  Stock bajo por defecto
                </span>

                <div className="settings-preferences__controls">
                  <input
                    min="0"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(event) => updateField("lowStockThreshold", event.target.value)}
                  />
                  <small>unidades</small>
                </div>
              </label>
            </div>
          </section>

          <footer className="settings-actions">
            {savedMessage && <span>{savedMessage}</span>}

            <button type="button" onClick={handleReset}>
              Restablecer
            </button>

            <button type="submit">
              <Save size={17} />
              Guardar cambios
            </button>
          </footer>
        </div>
      </form>
    </section>
  );
}
