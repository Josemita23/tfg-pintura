import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellCheck,
  CheckCheck,
  Eye,
  PackageX,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../../../services/api";
import type { Alert, AlertPriority, AlertType } from "../../../types/alert";
import "../styles/AlertsPage.css";

const alertTypeLabels: Record<AlertType, string> = {
  LOW_STOCK: "Stock bajo",
  OUT_OF_STOCK: "Material agotado",
  JOB_REMINDER: "Trabajo próximo",
  OVERLAP: "Solapamiento",
  BUDGET_PENDING: "Presupuesto pendiente",
  GENERAL: "General",
};

const priorityLabels: Record<AlertPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const priorityClassNames: Record<AlertPriority, string> = {
  LOW: "status-pill status-pill--info",
  MEDIUM: "status-pill status-pill--warning",
  HIGH: "status-pill status-pill--danger",
};

const readStatusLabels = {
  ALL: "Todas",
  UNREAD: "No leídas",
  READ: "Leídas",
};

type ReadStatusFilter = keyof typeof readStatusLabels;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAlertIcon(alert: Alert) {
  if (alert.alert_type === "OUT_OF_STOCK") {
    return <PackageX size={18} />;
  }

  if (alert.alert_type === "LOW_STOCK" || alert.priority === "HIGH") {
    return <AlertTriangle size={18} />;
  }

  return <Bell size={18} />;
}

function getRelatedEntity(alert: Alert) {
  if (alert.material_name) {
    return alert.material_name;
  }

  if (alert.job_title) {
    return alert.job_title;
  }

  if (alert.calendar_event_title) {
    return alert.calendar_event_title;
  }

  return "Sin elemento asociado";
}

function notifyAlertsChanged() {
  window.dispatchEvent(new Event("alerts:changed"));
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AlertType | "ALL">("ALL");
  const [readStatusFilter, setReadStatusFilter] =
    useState<ReadStatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await api.get<Alert[]>("/alerts/");
      setAlerts(response.data);
    } catch {
      setErrorMessage("No se han podido cargar las alertas.");
    } finally {
      setIsLoading(false);
    }
  }

  const unreadAlerts = alerts.filter((alert) => !alert.is_read);
  const highPriorityAlerts = alerts.filter((alert) => alert.priority === "HIGH");
  const stockAlerts = alerts.filter((alert) =>
    ["LOW_STOCK", "OUT_OF_STOCK"].includes(alert.alert_type)
  );

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        alert.title.toLowerCase().includes(normalizedSearch) ||
        alert.description.toLowerCase().includes(normalizedSearch) ||
        getRelatedEntity(alert).toLowerCase().includes(normalizedSearch);

      const matchesType =
        typeFilter === "ALL" || alert.alert_type === typeFilter;

      const matchesReadStatus =
        readStatusFilter === "ALL" ||
        (readStatusFilter === "UNREAD" && !alert.is_read) ||
        (readStatusFilter === "READ" && alert.is_read);

      return matchesSearch && matchesType && matchesReadStatus;
    });
  }, [alerts, search, typeFilter, readStatusFilter]);

  async function handleMarkAsRead(alertToUpdate: Alert) {
    if (alertToUpdate.is_read) {
      return;
    }

    try {
      const response = await api.post<Alert>(
        `/alerts/${alertToUpdate.id}/mark-as-read/`
      );

      setAlerts((currentAlerts) =>
        currentAlerts.map((currentAlert) =>
          currentAlert.id === alertToUpdate.id ? response.data : currentAlert
        )
      );
      notifyAlertsChanged();
    } catch {
      window.alert("No se ha podido marcar la alerta como leída.");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await api.post("/alerts/mark-all-as-read/");
      await loadAlerts();
      notifyAlertsChanged();
    } catch {
      alert("No se han podido marcar todas las alertas como leídas.");
    }
  }

  async function handleDeleteAlert(alertToDelete: Alert) {
    const hasConfirmed = window.confirm(
      `¿Seguro que quieres eliminar la alerta "${alertToDelete.title}"?`
    );

    if (!hasConfirmed) {
      return;
    }

    try {
      await api.delete(`/alerts/${alertToDelete.id}/`);

      setAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert.id !== alertToDelete.id)
      );
      notifyAlertsChanged();
    } catch {
      alert("No se ha podido eliminar la alerta.");
    }
  }

  return (
    <section className="alerts-page">
      <div className="alerts-page__header page-header">
        <div>
          <h1 className="page-header__title">Alertas</h1>
          <p className="page-header__subtitle">
            Consulta avisos relacionados con materiales, trabajos y planificación
          </p>
        </div>

        <div className="alerts-page__header-actions">
          <button
            type="button"
            className="alerts-page__primary-button"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck size={18} />
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="alerts-summary">
        <article className="alerts-summary__card card">
          <div>
            <p>Total alertas</p>
            <strong>{alerts.length}</strong>
          </div>
          <Bell size={22} />
        </article>

        <article className="alerts-summary__card card">
          <div>
            <p>No leídas</p>
            <strong>{unreadAlerts.length}</strong>
          </div>
          <BellCheck size={22} />
        </article>

        <article className="alerts-summary__card card">
          <div>
            <p>Prioridad alta</p>
            <strong>{highPriorityAlerts.length}</strong>
          </div>
          <AlertTriangle size={22} />
        </article>

        <article className="alerts-summary__card card">
          <div>
            <p>Stock</p>
            <strong>{stockAlerts.length}</strong>
          </div>
          <PackageX size={22} />
        </article>
      </div>

      <section className="alerts-card card">
        <div className="alerts-toolbar">
          <label className="alerts-search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar alerta..."
            />
          </label>

          <div className="alerts-toolbar__right">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as AlertType | "ALL")
              }
            >
              <option value="ALL">Todos los tipos</option>
              <option value="LOW_STOCK">Stock bajo</option>
              <option value="OUT_OF_STOCK">Material agotado</option>
              <option value="JOB_REMINDER">Trabajo próximo</option>
              <option value="OVERLAP">Solapamiento</option>
              <option value="BUDGET_PENDING">Presupuesto pendiente</option>
              <option value="GENERAL">General</option>
            </select>

            <select
              value={readStatusFilter}
              onChange={(event) =>
                setReadStatusFilter(event.target.value as ReadStatusFilter)
              }
            >
              <option value="ALL">Todas</option>
              <option value="UNREAD">No leídas</option>
              <option value="READ">Leídas</option>
            </select>
          </div>
        </div>

        {isLoading && <p className="alerts-state">Cargando alertas...</p>}

        {!isLoading && errorMessage && (
          <p className="alerts-state alerts-state--error">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && (
          <div className="alerts-list">
            {filteredAlerts.map((alert) => (
              <article
                key={alert.id}
                className={[
                  "alerts-item",
                  alert.is_read ? "alerts-item--read" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="alerts-item__icon">{getAlertIcon(alert)}</div>

                <div className="alerts-item__content">
                  <div className="alerts-item__header">
                    <div>
                      <span>{alertTypeLabels[alert.alert_type]}</span>
                      <h3>{alert.title}</h3>
                    </div>

                    <div className="alerts-item__badges">
                      <span className={priorityClassNames[alert.priority]}>
                        {priorityLabels[alert.priority]}
                      </span>

                      <span
                        className={
                          alert.is_read
                            ? "status-pill status-pill--success"
                            : "status-pill status-pill--warning"
                        }
                      >
                        {alert.is_read ? "Leída" : "Pendiente"}
                      </span>
                    </div>
                  </div>

                  <p>{alert.description || "Sin descripción."}</p>

                  <footer className="alerts-item__footer">
                    <span>Relacionado con: {getRelatedEntity(alert)}</span>
                    <span>{formatDate(alert.created_at)}</span>
                  </footer>
                </div>

                <div className="alerts-item__actions">
                  <button
                    type="button"
                    title="Marcar como leída"
                    onClick={() => handleMarkAsRead(alert)}
                    disabled={alert.is_read}
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    title="Eliminar alerta"
                    onClick={() => handleDeleteAlert(alert)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}

            {filteredAlerts.length === 0 && (
              <p className="alerts-state">
                No hay alertas que coincidan con los filtros seleccionados.
              </p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}