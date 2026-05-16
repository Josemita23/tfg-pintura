import { useEffect, useMemo, useState } from "react";
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
import type { Budget } from "../../../types/budget";
import type { Job } from "../../../types/job";
import type { Material } from "../../../types/material";
import type { CalendarEvent } from "../../../types/planning";
import { useAuth } from "../../auth/AuthContext";
import "../styles/DashboardPage.css";

type DashboardData = {
  jobs: Job[];
  budgets: Budget[];
  events: CalendarEvent[];
  materials: Material[];
};

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

function isSameMonth(dateValue: string | null) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();

  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function isFutureDate(dateValue: string | null) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date > today;
}

function formatMonthShort(dateValue: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(new Date(`${dateValue}T00:00:00`))
    .replace(".", "");
}

function formatJobTime(job: Job) {
  if (!job.start_time) {
    return "Sin hora";
  }

  return job.start_time.slice(0, 5);
}

const jobStatusLabels = {
  PENDING: "Pendiente",
  PLANNED: "Planificado",
  IN_PROGRESS: "En curso",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    jobs: [],
    budgets: [],
    events: [],
    materials: [],
  });
  const [dashboardAlerts, setDashboardAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  const firstName = user?.full_name?.trim().split(/\s+/)[0] || "Usuario";

  useEffect(() => {
    loadDashboardData();
    loadDashboardAlerts();
  }, []);

  const upcomingJobs = useMemo(() => {
    return dashboardData.jobs
      .filter((job) => isFutureDate(job.start_date))
      .sort((firstJob, secondJob) => {
        const firstDate = `${firstJob.start_date ?? ""}T${firstJob.start_time ?? "00:00:00"}`;
        const secondDate = `${secondJob.start_date ?? ""}T${secondJob.start_time ?? "00:00:00"}`;

        return new Date(firstDate).getTime() - new Date(secondDate).getTime();
      })
      .slice(0, 3);
  }, [dashboardData.jobs]);

  const stats = useMemo(
    () => [
      {
        label: "Trabajos este mes",
        value: dashboardData.jobs.filter((job) => isSameMonth(job.start_date)).length,
        icon: CalendarDays,
        variant: "blue",
      },
      {
        label: "Presupuestos sin enviar",
        value: dashboardData.budgets.filter((budget) => budget.status === "DRAFT").length,
        icon: FileText,
        variant: "green",
      },
      {
        label: "Visitas planificadas",
        value: dashboardData.events.filter(
          (event) => event.event_type === "VISIT" && event.status === "PLANNED"
        ).length,
        icon: Clock,
        variant: "purple",
      },
      {
        label: "Materiales con bajo stock",
        value: dashboardData.materials.filter((material) => material.status === "LOW_STOCK").length,
        icon: Layers,
        variant: "orange",
      },
    ],
    [dashboardData]
  );

  async function loadDashboardData() {
    try {
      setIsLoading(true);

      const [jobsResponse, budgetsResponse, eventsResponse, materialsResponse] =
        await Promise.allSettled([
          api.get<Job[]>("/jobs/"),
          api.get<Budget[]>("/budgets/"),
          api.get<CalendarEvent[]>("/planning/"),
          api.get<Material[]>("/materials/"),
        ]);

      setDashboardData({
        jobs: jobsResponse.status === "fulfilled" ? jobsResponse.value.data : [],
        budgets: budgetsResponse.status === "fulfilled" ? budgetsResponse.value.data : [],
        events: eventsResponse.status === "fulfilled" ? eventsResponse.value.data : [],
        materials: materialsResponse.status === "fulfilled" ? materialsResponse.value.data : [],
      });
    } catch {
      setDashboardData({
        jobs: [],
        budgets: [],
        events: [],
        materials: [],
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDashboardAlerts() {
    try {
      setIsLoadingAlerts(true);

      await api.post("/alerts/generate-job-reminders/");

      const response = await api.get<Alert[]>("/alerts/");
      const sortedAlerts = response.data
        .sort(
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
            <article key={stat.label} className={`dashboard-stat dashboard-stat--${stat.variant}`}>
              <div>
                <p className="dashboard-stat__label">{stat.label}</p>
                <strong className="dashboard-stat__value">
                  {isLoading ? "..." : stat.value}
                </strong>
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
              <p>Los 3 siguientes trabajos con fecha posterior a hoy</p>
            </div>

            <button type="button" onClick={() => navigate("/trabajos")}>
              Ver todos
            </button>
          </div>

          <div className="upcoming-jobs">
            {isLoading && <p className="dashboard-state">Cargando trabajos...</p>}

            {!isLoading &&
              upcomingJobs.map((job) => (
                <article key={job.id} className="upcoming-job">
                  <div className="upcoming-job__date">
                    <strong>{new Date(`${job.start_date}T00:00:00`).getDate()}</strong>
                    <span>{formatMonthShort(job.start_date ?? "")}</span>
                  </div>

                  <div className="upcoming-job__info">
                    <h3>{job.title}</h3>
                    <p>{job.client_name || "Sin cliente"}</p>
                  </div>

                  <div className="upcoming-job__meta">
                    <strong>{formatJobTime(job)}</strong>
                    <span className="status-pill status-pill--success">
                      {jobStatusLabels[job.status]}
                    </span>
                  </div>
                </article>
              ))}

            {!isLoading && upcomingJobs.length === 0 && (
              <p className="dashboard-state">No hay próximos trabajos.</p>
            )}
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
            {isLoadingAlerts && <p className="dashboard-state">Cargando alertas...</p>}

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
              <p className="dashboard-state">No hay alertas registradas.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
