import {
  Briefcase,
  CalendarDays,
  Clock,
  Edit,
  FileText,
  MapPin,
  User,
  X,
} from "lucide-react";

import type { Job, JobStatus } from "../../../types/job";
import "./JobDetailModal.css";

type JobDetailModalProps = {
  isOpen: boolean;
  job: Job | null;
  onClose: () => void;
  onEdit: (job: Job) => void;
};

const statusLabels: Record<JobStatus, string> = {
  PENDING: "Pendiente",
  PLANNED: "Planificado",
  IN_PROGRESS: "En progreso",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

const statusClassNames: Record<JobStatus, string> = {
  PENDING: "status-pill status-pill--warning",
  PLANNED: "status-pill status-pill--info",
  IN_PROGRESS: "status-pill status-pill--success",
  FINISHED: "status-pill status-pill--success",
  CANCELLED: "status-pill status-pill--danger",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES").format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "Sin hora";
  }

  return value.slice(0, 5);
}

export function JobDetailModal({ isOpen, job, onClose, onEdit }: JobDetailModalProps) {
  if (!isOpen || !job) {
    return null;
  }

  return (
    <div className="job-detail-backdrop">
      <section className="job-detail-modal">
        <header className="job-detail-modal__header">
          <div>
            <h2>{job.title}</h2>
            <p>{job.client_name}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Cerrar detalle">
            <X size={20} />
          </button>
        </header>

        <div className="job-detail-modal__content">
          <section className="job-detail-hero">
            <div className="job-detail-hero__icon">
              <Briefcase size={28} />
            </div>

            <div className="job-detail-hero__info">
              <div className="job-detail-hero__title">
                <h3>{job.title}</h3>
                <span className={statusClassNames[job.status]}>
                  {statusLabels[job.status]}
                </span>
              </div>

              <p>{job.description || "Trabajo registrado sin descripción adicional."}</p>
            </div>
          </section>

          <section className="job-detail-summary">
            <article>
              <User size={19} />
              <div>
                <span>Cliente</span>
                <strong>{job.client_name}</strong>
              </div>
            </article>

            <article>
              <FileText size={19} />
              <div>
                <span>Presupuesto</span>
                <strong>{job.budget_code || "Sin presupuesto"}</strong>
              </div>
            </article>

            <article>
              <CalendarDays size={19} />
              <div>
                <span>Fecha inicio</span>
                <strong>{formatDate(job.start_date)}</strong>
              </div>
            </article>

            <article>
              <CalendarDays size={19} />
              <div>
                <span>Fecha fin</span>
                <strong>{formatDate(job.end_date)}</strong>
              </div>
            </article>

            <article>
              <Clock size={19} />
              <div>
                <span>Hora inicio</span>
                <strong>{formatTime(job.start_time)}</strong>
              </div>
            </article>

            <article>
              <Clock size={19} />
              <div>
                <span>Hora fin</span>
                <strong>{formatTime(job.end_time)}</strong>
              </div>
            </article>
          </section>

          <section className="job-detail-location">
            <div>
              <MapPin size={18} />
              <h3>Dirección del trabajo</h3>
            </div>

            <p>{job.address || "No se ha registrado una dirección para este trabajo."}</p>
          </section>

          <section className="job-detail-notes">
            <h3>Observaciones</h3>
            <p>{job.notes || "No hay observaciones registradas."}</p>
          </section>

          <footer className="job-detail-actions">
            <button className="job-detail-actions__secondary" type="button" onClick={onClose}>
              Cerrar
            </button>

            <button
              className="job-detail-actions__primary"
              type="button"
              onClick={() => onEdit(job)}
            >
              <Edit size={17} />
              Editar trabajo
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}