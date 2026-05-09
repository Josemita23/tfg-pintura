import { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";

import { api } from "../../../services/api";
import type { Client, ClientStatus } from "../../../types/client";
import "../styles/ClientsPage.css";
import { ClientFormModal } from "../components/ClientFormModal";

const statusLabels: Record<ClientStatus, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    POTENTIAL: "Potencial",
};

const statusClassNames: Record<ClientStatus, string> = {
    ACTIVE: "status-pill status-pill--success",
    INACTIVE: "status-pill status-pill--danger",
    POTENTIAL: "status-pill status-pill--warning",
};

export function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<ClientStatus | "ALL">("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSavingClient, setIsSavingClient] = useState(false);

    useEffect(() => {
        async function loadClients() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const response = await api.get<Client[]>("/clients/");
                setClients(response.data);
            } catch {
                setErrorMessage("No se han podido cargar los clientes.");
            } finally {
                setIsLoading(false);
            }
        }

        loadClients();
    }, []);

    const filteredClients = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return clients.filter((client) => {
            const matchesStatus = selectedStatus === "ALL" || client.status === selectedStatus;

            const matchesSearch =
                normalizedSearch.length === 0 ||
                client.full_name.toLowerCase().includes(normalizedSearch) ||
                client.phone.toLowerCase().includes(normalizedSearch) ||
                (client.email ?? "").toLowerCase().includes(normalizedSearch) ||
                client.address.toLowerCase().includes(normalizedSearch);

            return matchesStatus && matchesSearch;
        });
    }, [clients, search, selectedStatus]);

    async function handleCreateClient(data: {
        first_name: string;
        last_name: string;
        phone: string;
        email: string;
        address: string;
        notes: string;
        status: ClientStatus;
    }) {
        setIsSavingClient(true);

        try {
            const response = await api.post<Client>("/clients/", {
                ...data,
                email: data.email.trim() || null,
            });

            setClients((currentClients) => [...currentClients, response.data]);
            setIsCreateModalOpen(false);
        } finally {
            setIsSavingClient(false);
        }
    }

    return (
        <section className="clients-page">
            <div className="page-header clients-page__header">
                <div>
                    <h1 className="page-header__title">Gestión de clientes</h1>
                    <p className="page-header__subtitle">Administra la información de tus clientes</p>
                </div>

                <button
                    className="clients-page__create-button"
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} />
                    Nuevo cliente
                </button>
            </div>

            <section className="card clients-card">
                <div className="clients-toolbar">
                    <div className="clients-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="clients-toolbar__right">
                        <select
                            value={selectedStatus}
                            onChange={(event) => setSelectedStatus(event.target.value as ClientStatus | "ALL")}
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="ACTIVE">Activos</option>
                            <option value="POTENTIAL">Potenciales</option>
                            <option value="INACTIVE">Inactivos</option>
                        </select>

                        <button className="clients-filter-button" type="button">
                            <SlidersHorizontal size={17} />
                            Filtros
                        </button>
                    </div>
                </div>

                {isLoading && <p className="clients-state">Cargando clientes...</p>}

                {!isLoading && errorMessage && <p className="clients-state clients-state--error">{errorMessage}</p>}

                {!isLoading && !errorMessage && (
                    <>
                        <div className="clients-table-wrapper">
                            <table className="clients-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Contacto</th>
                                        <th>Teléfono</th>
                                        <th>Email</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredClients.map((client) => (
                                        <tr key={client.id}>
                                            <td>
                                                <div className="clients-table__client">
                                                    <div className="clients-table__avatar">
                                                        {client.first_name.charAt(0)}
                                                        {client.last_name.charAt(0)}
                                                    </div>

                                                    <div>
                                                        <strong>{client.full_name}</strong>
                                                        <span>{client.address || "Sin dirección registrada"}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{client.full_name}</td>
                                            <td>{client.phone}</td>
                                            <td>{client.email || "Sin email"}</td>
                                            <td>
                                                <span className={statusClassNames[client.status]}>
                                                    {statusLabels[client.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="clients-table__actions">
                                                    <button type="button" aria-label="Ver cliente">
                                                        <Eye size={16} />
                                                    </button>

                                                    <button type="button" aria-label="Editar cliente">
                                                        <Edit size={16} />
                                                    </button>

                                                    <button type="button" aria-label="Eliminar cliente">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredClients.length === 0 && (
                            <p className="clients-state">No hay clientes que coincidan con la búsqueda.</p>
                        )}

                        <div className="clients-footer">
                            <p>
                                Mostrando {filteredClients.length} de {clients.length} clientes
                            </p>

                            <div className="clients-pagination">
                                <button type="button" disabled>
                                    1
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
            <ClientFormModal
                isOpen={isCreateModalOpen}
                isSaving={isSavingClient}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateClient}
            />
        </section>
    );
}