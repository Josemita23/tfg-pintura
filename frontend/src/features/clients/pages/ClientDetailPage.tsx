import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Briefcase,
    CalendarDays,
    Edit,
    FileText,
    Mail,
    MapPin,
    Phone,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../services/api";
import type { Budget, BudgetStatus } from "../../../types/budget";
import type { Client, ClientStatus } from "../../../types/client";
import type { Job, JobStatus } from "../../../types/job";
import "../styles/ClientDetailPage.css";
import {
    ClientFormModal,
    type ClientFormData,
} from "../components/ClientFormModal";

const clientStatusLabels: Record<ClientStatus, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    POTENTIAL: "Potencial",
};

const clientStatusClassNames: Record<ClientStatus, string> = {
    ACTIVE: "status-pill status-pill--success",
    INACTIVE: "status-pill status-pill--danger",
    POTENTIAL: "status-pill status-pill--warning",
};

const budgetStatusLabels: Record<BudgetStatus, string> = {
    DRAFT: "Borrador",
    PENDING: "Pendiente",
    ACCEPTED: "Aceptado",
    REJECTED: "Rechazado",
    CONVERTED: "Convertido",
};

const jobStatusLabels: Record<JobStatus, string> = {
    PENDING: "Pendiente",
    PLANNED: "Planificado",
    IN_PROGRESS: "En progreso",
    FINISHED: "Finalizado",
    CANCELLED: "Cancelado",
};

function formatCurrency(value: string | number) {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(Number(value));
}

function formatDate(value: string | null) {
    if (!value) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-ES").format(new Date(value));
}

export function ClientDetailPage() {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState<Client | null>(null);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSavingClient, setIsSavingClient] = useState(false);

    const numericClientId = Number(clientId);

    useEffect(() => {
        async function loadClientDetail() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const [clientResponse, budgetsResponse, jobsResponse] = await Promise.all([
                    api.get<Client>(`/clients/${numericClientId}/`),
                    api.get<Budget[]>("/budgets/"),
                    api.get<Job[]>("/jobs/"),
                ]);

                setClient(clientResponse.data);
                setBudgets(
                    budgetsResponse.data.filter((budget) => budget.client === numericClientId)
                );
                setJobs(jobsResponse.data.filter((job) => job.client === numericClientId));
            } catch {
                setErrorMessage("No se ha podido cargar el detalle del cliente.");
            } finally {
                setIsLoading(false);
            }
        }

        if (Number.isNaN(numericClientId)) {
            setErrorMessage("Cliente no válido.");
            setIsLoading(false);
            return;
        }

        loadClientDetail();
    }, [numericClientId]);

    const summary = useMemo(() => {
        const acceptedBudgets = budgets.filter((budget) => budget.status === "ACCEPTED").length;
        const activeJobs = jobs.filter(
            (job) => job.status === "PLANNED" || job.status === "IN_PROGRESS"
        ).length;

        return {
            totalBudgets: budgets.length,
            totalJobs: jobs.length,
            acceptedBudgets,
            activeJobs,
        };
    }, [budgets, jobs]);

    async function handleUpdateClient(data: ClientFormData) {
        if (!client) {
            return;
        }

        setIsSavingClient(true);

        try {
            const response = await api.patch<Client>(`/clients/${client.id}/`, {
                ...data,
                email: data.email.trim() || null,
            });

            setClient(response.data);
            setIsEditModalOpen(false);
        } finally {
            setIsSavingClient(false);
        }
    }

    if (isLoading) {
        return <p className="clients-state">Cargando detalle del cliente...</p>;
    }

    if (errorMessage || !client) {
        return (
            <section>
                <button className="client-detail__back-button" type="button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={17} />
                    Volver
                </button>

                <p className="clients-state clients-state--error">
                    {errorMessage || "No se ha encontrado el cliente."}
                </p>
            </section>
        );
    }

    return (
        <section className="client-detail-page">
            <div className="client-detail__top">
                <button className="client-detail__back-button" type="button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={17} />
                    Volver
                </button>

                <button
                    className="client-detail__edit-button"
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                >
                    <Edit size={17} />
                    Editar cliente
                </button>
            </div>

            <section className="card client-detail-hero">
                <div className="client-detail-hero__avatar">
                    {client.first_name.charAt(0)}
                    {client.last_name.charAt(0)}
                </div>

                <div className="client-detail-hero__info">
                    <div className="client-detail-hero__title">
                        <h1>{client.full_name}</h1>
                        <span className={clientStatusClassNames[client.status]}>
                            {clientStatusLabels[client.status]}
                        </span>
                    </div>

                    <p>{client.notes || "Cliente registrado en el sistema de gestión de trabajos."}</p>

                    <div className="client-detail-hero__contact">
                        <span>
                            <Phone size={16} />
                            {client.phone}
                        </span>

                        <span>
                            <Mail size={16} />
                            {client.email || "Sin email"}
                        </span>

                        <span>
                            <MapPin size={16} />
                            {client.address || "Sin dirección registrada"}
                        </span>
                    </div>
                </div>
            </section>

            <section className="client-detail-summary">
                <article className="card client-detail-summary__card">
                    <div>
                        <p>Presupuestos</p>
                        <strong>{summary.totalBudgets}</strong>
                    </div>
                    <FileText size={22} />
                </article>

                <article className="card client-detail-summary__card">
                    <div>
                        <p>Presupuestos aceptados</p>
                        <strong>{summary.acceptedBudgets}</strong>
                    </div>
                    <FileText size={22} />
                </article>

                <article className="card client-detail-summary__card">
                    <div>
                        <p>Trabajos</p>
                        <strong>{summary.totalJobs}</strong>
                    </div>
                    <Briefcase size={22} />
                </article>

                <article className="card client-detail-summary__card">
                    <div>
                        <p>Trabajos activos</p>
                        <strong>{summary.activeJobs}</strong>
                    </div>
                    <CalendarDays size={22} />
                </article>
            </section>

            <div className="client-detail-grid">
                <section className="card client-detail-card">
                    <div className="client-detail-card__header">
                        <div>
                            <h2>Presupuestos recientes</h2>
                            <p>Historial económico asociado al cliente</p>
                        </div>

                        <Link to="/presupuestos">Ver todos</Link>
                    </div>

                    <div className="client-detail-table-wrapper">
                        <table className="client-detail-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {budgets.map((budget) => (
                                    <tr key={budget.id}>
                                        <td>{budget.code}</td>
                                        <td>{formatDate(budget.date)}</td>
                                        <td>{budgetStatusLabels[budget.status]}</td>
                                        <td>{formatCurrency(budget.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {budgets.length === 0 && (
                        <p className="client-detail-empty">Este cliente todavía no tiene presupuestos.</p>
                    )}
                </section>

                <section className="card client-detail-card">
                    <div className="client-detail-card__header">
                        <div>
                            <h2>Trabajos asociados</h2>
                            <p>Seguimiento de trabajos realizados o planificados</p>
                        </div>

                        <Link to="/trabajos">Ver todos</Link>
                    </div>

                    <div className="client-detail-table-wrapper">
                        <table className="client-detail-table">
                            <thead>
                                <tr>
                                    <th>Trabajo</th>
                                    <th>Inicio</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>

                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.id}>
                                        <td>{job.title}</td>
                                        <td>{formatDate(job.start_date)}</td>
                                        <td>{jobStatusLabels[job.status]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {jobs.length === 0 && (
                        <p className="client-detail-empty">Este cliente todavía no tiene trabajos.</p>
                    )}
                </section>
            </div>
            <ClientFormModal
                isOpen={isEditModalOpen}
                isSaving={isSavingClient}
                client={client}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdateClient}
            />
        </section>
    );
}