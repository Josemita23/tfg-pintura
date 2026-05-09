import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileText,
  Layers,
  MoreHorizontal,
} from "lucide-react";

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

const alerts = [
  {
    icon: AlertTriangle,
    title: "Stock bajo",
    description: "Pintura blanca mate",
    variant: "danger",
  },
  {
    icon: Clock,
    title: "Trabajo próximo",
    description: "Mañana hay un trabajo planificado",
    variant: "info",
  },
  {
    icon: FileText,
    title: "Presupuesto pendiente",
    description: "Pendiente de revisión del cliente",
    variant: "warning",
  },
];

export function DashboardPage() {
  return (
    <section className="dashboard-page">
      <div className="page-header dashboard-page__header">
        <div>
          <h1 className="page-header__title">¡Hola, Manuel!</h1>
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

            <button type="button">Ver todos</button>
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

            <button type="button">Ver todas</button>
          </div>

          <div className="dashboard-alerts">
            {alerts.map((alert) => {
              const Icon = alert.icon;

              return (
                <article key={alert.title} className="dashboard-alert">
                  <div className={`dashboard-alert__icon dashboard-alert__icon--${alert.variant}`}>
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3>{alert.title}</h3>
                    <p>{alert.description}</p>
                  </div>

                  <button type="button" aria-label="Ver detalle">
                    <MoreHorizontal size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}