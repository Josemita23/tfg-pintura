import { useEffect, useMemo, useState } from "react";
import {
    Briefcase,
    CalendarDays,
    Edit,
    Eye,
    MapPin,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
} from "lucide-react";

import { api } from "../../../services/api";
import type { Budget } from "../../../types/budget";
import type { Client } from "../../../types/client";
import type { Job, JobStatus } from "../../../types/job";
import { JobFormModal, type JobFormData } from "../components/JobFormModal";
import "../styles/JobsPage.css";
import { JobDetailModal } from "../components/JobDetailModal";

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
        return "";
    }

    return value.slice(0, 5);
}

export function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);

    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<JobStatus | "ALL">("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isSavingJob, setIsSavingJob] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailJob, setDetailJob] = useState<Job | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const [jobsResponse, clientsResponse, budgetsResponse] = await Promise.all([
                api.get<Job[]>("/jobs/"),
                api.get<Client[]>("/clients/"),
                api.get<Budget[]>("/budgets/"),
            ]);

            setJobs(jobsResponse.data);
            setClients(clientsResponse.data);
            setBudgets(budgetsResponse.data);
        } catch {
            setErrorMessage("No se han podido cargar los trabajos.");
        } finally {
            setIsLoading(false);
        }
    }

    const filteredJobs = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return jobs.filter((job) => {
            const matchesStatus = selectedStatus === "ALL" || job.status === selectedStatus;

            const matchesSearch =
                normalizedSearch.length === 0 ||
                job.title.toLowerCase().includes(normalizedSearch) ||
                job.client_name.toLowerCase().includes(normalizedSearch) ||
                job.address.toLowerCase().includes(normalizedSearch) ||
                job.description.toLowerCase().includes(normalizedSearch) ||
                (job.budget_code ?? "").toLowerCase().includes(normalizedSearch);

            return matchesStatus && matchesSearch;
        });
    }, [jobs, search, selectedStatus]);

    function openCreateModal() {
        setSelectedJob(null);
        setIsFormModalOpen(true);
    }

    function openEditModal(job: Job) {
        setSelectedJob(job);
        setIsFormModalOpen(true);
    }

    function closeFormModal() {
        setSelectedJob(null);
        setIsFormModalOpen(false);
    }

    async function handleSubmitJob(data: JobFormData) {
        setIsSavingJob(true);

        try {
            if (selectedJob) {
                const response = await api.patch<Job>(`/jobs/${selectedJob.id}/`, data);

                setJobs((currentJobs) =>
                    currentJobs.map((job) => (job.id === selectedJob.id ? response.data : job))
                );
            } else {
                const response = await api.post<Job>("/jobs/", data);

                setJobs((currentJobs) => [response.data, ...currentJobs]);
            }

            closeFormModal();
        } finally {
            setIsSavingJob(false);
        }
    }

    async function handleDeleteJob(job: Job) {
        const hasConfirmed = window.confirm(`¿Seguro que quieres eliminar el trabajo "${job.title}"?`);

        if (!hasConfirmed) {
            return;
        }

        try {
            await api.delete(`/jobs/${job.id}/`);

            setJobs((currentJobs) => currentJobs.filter((currentJob) => currentJob.id !== job.id));
        } catch {
            alert("No se ha podido eliminar el trabajo. Puede que tenga información asociada.");
        }
    }

    async function openDetailModal(job: Job) {
        try {
            const response = await api.get<Job>(`/jobs/${job.id}/`);
            setDetailJob(response.data);
            setIsDetailModalOpen(true);
        } catch {
            alert("No se ha podido cargar el detalle del trabajo.");
        }
    }

    function closeDetailModal() {
        setDetailJob(null);
        setIsDetailModalOpen(false);
    }

    function handleEditFromDetail(job: Job) {
        closeDetailModal();
        openEditModal(job);
    }

    return (
        <section className="jobs-page">
            <div className="page-header jobs-page__header">
                <div>
                    <h1 className="page-header__title">Gestión de trabajos</h1>
                    <p className="page-header__subtitle">
                        Consulta, planifica y actualiza los trabajos registrados
                    </p>
                </div>

                <button className="jobs-page__create-button" type="button" onClick={openCreateModal}>
                    <Plus size={18} />
                    Nuevo trabajo
                </button>
            </div>

            <section className="jobs-summary">
                <article className="card jobs-summary__card">
                    <div>
                        <p>Total trabajos</p>
                        <strong>{jobs.length}</strong>
                    </div>
                    <Briefcase size={22} />
                </article>

                <article className="card jobs-summary__card">
                    <div>
                        <p>Planificados</p>
                        <strong>{jobs.filter((job) => job.status === "PLANNED").length}</strong>
                    </div>
                    <CalendarDays size={22} />
                </article>

                <article className="card jobs-summary__card">
                    <div>
                        <p>En progreso</p>
                        <strong>{jobs.filter((job) => job.status === "IN_PROGRESS").length}</strong>
                    </div>
                    <Briefcase size={22} />
                </article>

                <article className="card jobs-summary__card">
                    <div>
                        <p>Finalizados</p>
                        <strong>{jobs.filter((job) => job.status === "FINISHED").length}</strong>
                    </div>
                    <Briefcase size={22} />
                </article>
            </section>

            <section className="card jobs-card">
                <div className="jobs-toolbar">
                    <div className="jobs-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar trabajo..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="jobs-toolbar__right">
                        <select
                            value={selectedStatus}
                            onChange={(event) => setSelectedStatus(event.target.value as JobStatus | "ALL")}
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="PLANNED">Planificados</option>
                            <option value="IN_PROGRESS">En progreso</option>
                            <option value="FINISHED">Finalizados</option>
                            <option value="CANCELLED">Cancelados</option>
                        </select>

                        <button className="jobs-filter-button" type="button">
                            <SlidersHorizontal size={17} />
                            Filtros
                        </button>
                    </div>
                </div>

                {isLoading && <p className="jobs-state">Cargando trabajos...</p>}

                {!isLoading && errorMessage && (
                    <p className="jobs-state jobs-state--error">{errorMessage}</p>
                )}

                {!isLoading && !errorMessage && (
                    <>
                        <div className="jobs-table-wrapper">
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>Trabajo</th>
                                        <th>Cliente</th>
                                        <th>Presupuesto</th>
                                        <th>Fecha</th>
                                        <th>Horario</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredJobs.map((job) => (
                                        <tr key={job.id}>
                                            <td>
                                                <div className="jobs-table__job">
                                                    <div className="jobs-table__icon">
                                                        <Briefcase size={18} />
                                                    </div>

                                                    <div>
                                                        <strong>{job.title}</strong>
                                                        <span>
                                                            <MapPin size={13} />
                                                            {job.address || "Sin dirección"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{job.client_name}</td>
                                            <td>{job.budget_code || "Sin presupuesto"}</td>
                                            <td>
                                                {formatDate(job.start_date)}
                                                {job.end_date && job.end_date !== job.start_date
                                                    ? ` - ${formatDate(job.end_date)}`
                                                    : ""}
                                            </td>
                                            <td>
                                                {formatTime(job.start_time)}
                                                {job.start_time && job.end_time ? " - " : ""}
                                                {formatTime(job.end_time)}
                                            </td>
                                            <td>
                                                <span className={statusClassNames[job.status]}>
                                                    {statusLabels[job.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="jobs-table__actions">
                                                    <button
                                                        type="button"
                                                        aria-label="Ver trabajo"
                                                        onClick={() => openDetailModal(job)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label="Editar trabajo"
                                                        onClick={() => openEditModal(job)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label="Eliminar trabajo"
                                                        onClick={() => handleDeleteJob(job)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredJobs.length === 0 && (
                            <p className="jobs-state">No hay trabajos que coincidan con la búsqueda.</p>
                        )}

                        <div className="jobs-footer">
                            <p>
                                Mostrando {filteredJobs.length} de {jobs.length} trabajos
                            </p>

                            <div className="jobs-pagination">
                                <button type="button" disabled>
                                    1
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <JobFormModal
                isOpen={isFormModalOpen}
                isSaving={isSavingJob}
                job={selectedJob}
                clients={clients}
                budgets={budgets}
                onClose={closeFormModal}
                onSubmit={handleSubmitJob}
            />
            <JobDetailModal
                isOpen={isDetailModalOpen}
                job={detailJob}
                onClose={closeDetailModal}
                onEdit={handleEditFromDetail}
            />
        </section>
    );
}