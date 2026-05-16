import { Bell, Building2, Check, Clock, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../auth/AuthContext";
import { api } from "../../../services/api";
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

type ProfileResponse = {
  user: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    is_staff: boolean;
  };
};

type AppSettingsResponse = {
  id: number;
  default_start_time: string;
  default_end_time: string;
  low_stock_threshold: number;
  upcoming_job_days: number;
  updated_at: string;
};

const storageKeyPrefix = "pintura-plus-settings";

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

function getStorageKey(userId: number | undefined) {
  return `${storageKeyPrefix}-${userId ?? "guest"}`;
}

function loadSettings(storageKey: string) {
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

function normalizeTimeInputValue(value: string | undefined) {
  return value ? value.slice(0, 5) : "";
}

function parseIntegerInput(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    return fallback;
  }

  return parsedValue;
}

function notifyAlertsChanged() {
  window.dispatchEvent(new Event("alerts:changed"));
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const storageKey = getStorageKey(user?.id);
  const [formData, setFormData] = useState<SettingsFormData>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUserSettings() {
      const storedSettings = loadSettings(storageKey);

      try {
        const response = await api.get<AppSettingsResponse>("/app-settings/");
        const serverSettings = response.data;

        if (!isMounted) {
          return;
        }

        const nextFormData = {
          ...storedSettings,
          professionalName: user?.full_name || "",
          email: user?.email || "",
          role: storedSettings.role || "Profesional",
          defaultStartTime:
            normalizeTimeInputValue(serverSettings.default_start_time) ||
            storedSettings.defaultStartTime,
          defaultEndTime:
            normalizeTimeInputValue(serverSettings.default_end_time) ||
            storedSettings.defaultEndTime,
          lowStockThreshold: String(serverSettings.low_stock_threshold),
          upcomingJobDays: String(serverSettings.upcoming_job_days),
        };

        setFormData(nextFormData);
        window.localStorage.setItem(storageKey, JSON.stringify(nextFormData));
      } catch {
        if (!isMounted) {
          return;
        }

        setFormData({
          ...storedSettings,
          professionalName: user?.full_name || "",
          email: user?.email || "",
          role: storedSettings.role || "Profesional",
        });
      }
    }

    loadUserSettings();

    return () => {
      isMounted = false;
    };
  }, [storageKey, user]);

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
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const professionalName = formData.professionalName.trim();
    const email = formData.email.trim();
    const upcomingJobDays = parseIntegerInput(formData.upcomingJobDays, 3);
    const lowStockThreshold = parseIntegerInput(formData.lowStockThreshold, 5);

    if (!professionalName) {
      setErrorMessage("El nombre del profesional es obligatorio.");
      return;
    }

    if (!email) {
      setErrorMessage("El email es obligatorio.");
      return;
    }

    if (formData.defaultStartTime && formData.defaultEndTime) {
      if (formData.defaultEndTime <= formData.defaultStartTime) {
        setErrorMessage("La hora de fin debe ser posterior a la hora de inicio.");
        return;
      }
    }

    if (upcomingJobDays < 1 || upcomingJobDays > 365) {
      setErrorMessage("Los dias de aviso deben estar entre 1 y 365.");
      return;
    }

    if (lowStockThreshold < 0) {
      setErrorMessage("El stock bajo por defecto no puede ser negativo.");
      return;
    }

    const nextFormData = {
      ...formData,
      professionalName,
      email,
      upcomingJobDays: String(upcomingJobDays),
      lowStockThreshold: String(lowStockThreshold),
    };

    try {
      const response = await api.patch<ProfileResponse>("/auth/profile/", {
        full_name: professionalName,
        email,
      });

      await api.patch<AppSettingsResponse>("/app-settings/", {
        default_start_time: formData.defaultStartTime,
        default_end_time: formData.defaultEndTime,
        low_stock_threshold: lowStockThreshold,
        upcoming_job_days: upcomingJobDays,
      });

      window.localStorage.setItem(storageKey, JSON.stringify(nextFormData));
      setFormData(nextFormData);
      updateUser(response.data.user);
      notifyAlertsChanged();
      setSavedMessage("Configuracion guardada correctamente.");
      setErrorMessage("");
    } catch {
      setErrorMessage("No se han podido guardar los datos de configuracion.");
      setSavedMessage("");
    }
  }

  async function handleReset() {
    const nextFormData = {
      ...defaultSettings,
      professionalName: user?.full_name || defaultSettings.professionalName,
      email: user?.email || defaultSettings.email,
    };

    try {
      await api.patch<AppSettingsResponse>("/app-settings/", {
        default_start_time: nextFormData.defaultStartTime,
        default_end_time: nextFormData.defaultEndTime,
        low_stock_threshold: Number.parseInt(nextFormData.lowStockThreshold, 10),
        upcoming_job_days: Number.parseInt(nextFormData.upcomingJobDays, 10),
      });

      setFormData(nextFormData);
      window.localStorage.setItem(storageKey, JSON.stringify(nextFormData));
      notifyAlertsChanged();
      setSavedMessage("Configuracion restablecida.");
      setErrorMessage("");
    } catch {
      setErrorMessage("No se ha podido restablecer la configuracion.");
      setSavedMessage("");
    }
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
                  required
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
                  required
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
            {errorMessage && <span className="settings-actions__error">{errorMessage}</span>}
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
