import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileText,
  Layers,
  MoreHorizontal,
} from "lucide-react";

import { api } from "../../../services/api";
import type { Alert } from "../../../types/alert";
import { useAuth } from "../../auth/AuthContext";
import "../styles/DashboardPage.css";

const stats = [
  {
    label: "Tus próximos trabajos",
    value: "3",
    icon: CalendarDays,
    variant: "blue",
  },
  {
    label: "Presupuestos por enviar",
    value: "5",
    icon: FileText,
    variant: "green",
  },
  {
    label: "Visitas programadas",
    value: "2",
    icon: Clock,
    variant: "purple",
  },
  {
    label: "Materiales con bajo stock",
    value: "4",
    icon: Layers,
    variant: "orange",
  },
];

const upcomingJobs = [
  {
    day: "16",
    title: "Calle Betis, 14",
    client: "Manuel López",
    time: "09:00",
    status: "En curso",
  },
  {
    day: "18",
    title: "Calle Feria, 22",
    client: "Carmen Ruiz",
    time: "11:30",
    status: "Pendiente",
  },
  {
    day: "20",
    title: "Piso B, 3º",
    client: "Pedro Jiménez",
    time: "08:30",
    status: "Confirmado",
  },
];

function notifyAlertsChanged() {
  window.dispatchEvent(new Event("alerts:changed"));
}

function getAlertIcon(alert: Alert) {
  if (alert.alert_type === "JOB_REMINDER") {
    return Clock;
  }

  if (alert.alert_type === "BUDGET_PENDING") {
    return FileText;
  }

  return AlertTriangle;
}

function getAlertVariant(alert: Alert) {
  if (alert.priority === "HIGH") {
    return "danger";
  }

  if (alert.alert_type === "JOB_REMINDER") {
    return "info";
  }

  if (alert.priority === "MEDIUM") {
    return "warning";
  }

  return "info";
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardAlerts, setDashboardAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  const firstName = user?.full_name?.trim().split(/\s+/)[0] || "Usuario";

  useEffect(() => {
    loadDashboardAlerts();
  }, []);

  async function loadDashboardAlerts() {
    try {
      setIsLoadingAlerts(true);

      await api.post("/alerts/generate-job-reminders/");

      const response = await api.get<Alert[]>("/alerts/");
      const sortedAlerts = response.data.sort(
        (firstAlert, secondAlert) =>
          new Date(secondAlert.created_at).getTime() -
          new Date(firstAlert.created_at).getTime()
      );

      setDashboardAlerts(sortedAlerts.slice(0, 3));
      notifyAlertsChanged();
    } catch {
      setDashboardAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="page-header dashboard-page__header">
        <div>
          <h1 className="page-header__title">¡Hola, {firstName}!</h1>
          <p className="page-header__subtitle">Aquí tienes un resumen de tu actividad</p>
        </div>
      </div>

      <div className="dashboard-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className={`dashboard-stat dashboard-stat--${stat.variant}`}
            >
              <div>
                <p className="dashboard-stat__label">{stat.label}</p>
                <strong className="dashboard-stat__value">{stat.value}</strong>
              </div>

              <div className="dashboard-stat__icon">
                <Icon size={20} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Próximos trabajos</h2>
              <p>Trabajos programados esta semana</p>
            </div>

            <button type="button" onClick={() => navigate("/trabajos")}>
              Ver todos
            </button>
          </div>

          <div className="upcoming-jobs">
            {upcomingJobs.map((job) => (
              <article key={`${job.day}-${job.title}`} className="upcoming-job">
                <div className="upcoming-job__date">
                  <strong>{job.day}</strong>
                  <span>jun</span>
                </div>

                <div className="upcoming-job__info">
                  <h3>{job.title}</h3>
                  <p>{job.client}</p>
                </div>

                <div className="upcoming-job__meta">
                  <strong>{job.time}</strong>
                  <span className="status-pill status-pill--success">{job.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Alertas</h2>
              <p>Incidencias y avisos relevantes</p>
            </div>

            <button type="button" onClick={() => navigate("/alertas")}>
              Ver todas
            </button>
          </div>

          <div className="dashboard-alerts">
            {isLoadingAlerts && <p>Cargando alertas...</p>}

            {!isLoadingAlerts &&
              dashboardAlerts.map((alert) => {
                const Icon = getAlertIcon(alert);
                const variant = getAlertVariant(alert);

                return (
                  <article key={alert.id} className="dashboard-alert">
                    <div className={`dashboard-alert__icon dashboard-alert__icon--${variant}`}>
                      <Icon size={18} />
                    </div>

                    <div>
                      <h3>{alert.title}</h3>
                      <p>{alert.description || "Sin descripción."}</p>
                    </div>

                    <button
                      type="button"
                      aria-label="Ver detalle"
                      onClick={() => navigate("/alertas")}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </article>
                );
              })}

            {!isLoadingAlerts && dashboardAlerts.length === 0 && (
              <p>No hay alertas pendientes.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}