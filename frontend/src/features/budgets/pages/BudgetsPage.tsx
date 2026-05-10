import { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { api } from "../../../services/api";
import type { Budget, BudgetItem, BudgetStatus } from "../../../types/budget";
import type { Client } from "../../../types/client";
import {
  BudgetDetailModal,
} from "../components/BudgetDetailModal";
import {
  BudgetFormModal,
  type BudgetFormData,
} from "../components/BudgetFormModal";
import "../styles/BudgetsPage.css";

const statusLabels: Record<BudgetStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  CONVERTED: "Convertido",
};

const statusClassNames: Record<BudgetStatus, string> = {
  DRAFT: "status-pill status-pill--info",
  PENDING: "status-pill status-pill--warning",
  ACCEPTED: "status-pill status-pill--success",
  REJECTED: "status-pill status-pill--danger",
  CONVERTED: "status-pill status-pill--success",
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES").format(new Date(value));
}

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<BudgetStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailBudget, setDetailBudget] = useState<Budget | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [budgetsResponse, clientsResponse] = await Promise.all([
        api.get<Budget[]>("/budgets/"),
        api.get<Client[]>("/clients/"),
      ]);

      setBudgets(budgetsResponse.data);
      setClients(clientsResponse.data);
    } catch {
      setErrorMessage("No se han podido cargar los presupuestos.");
    } finally {
      setIsLoading(false);
    }
  }

  async function reloadBudget(budgetId: number) {
    const response = await api.get<Budget>(`/budgets/${budgetId}/`);

    setBudgets((currentBudgets) =>
      currentBudgets.map((budget) => (budget.id === budgetId ? response.data : budget))
    );

    setDetailBudget(response.data);
  }

  const filteredBudgets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return budgets.filter((budget) => {
      const matchesStatus = selectedStatus === "ALL" || budget.status === selectedStatus;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        budget.code.toLowerCase().includes(normalizedSearch) ||
        budget.client_name.toLowerCase().includes(normalizedSearch) ||
        budget.description.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [budgets, search, selectedStatus]);

  function openCreateModal() {
    setSelectedBudget(null);
    setIsFormModalOpen(true);
  }

  function openEditModal(budget: Budget) {
    setSelectedBudget(budget);
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setSelectedBudget(null);
    setIsFormModalOpen(false);
  }

  async function openDetailModal(budget: Budget) {
    setIsDetailModalOpen(true);

    const response = await api.get<Budget>(`/budgets/${budget.id}/`);
    setDetailBudget(response.data);
  }

  function closeDetailModal() {
    setDetailBudget(null);
    setIsDetailModalOpen(false);
  }

  async function handleSubmitBudget(data: BudgetFormData) {
    setIsSavingBudget(true);

    try {
      if (selectedBudget) {
        const response = await api.patch<Budget>(`/budgets/${selectedBudget.id}/`, data);

        setBudgets((currentBudgets) =>
          currentBudgets.map((budget) =>
            budget.id === selectedBudget.id ? response.data : budget
          )
        );
      } else {
        const response = await api.post<Budget>("/budgets/", data);

        setBudgets((currentBudgets) => [response.data, ...currentBudgets]);
      }

      closeFormModal();
    } finally {
      setIsSavingBudget(false);
    }
  }

  async function handleDeleteBudget(budget: Budget) {
    const hasConfirmed = window.confirm(
      `¿Seguro que quieres eliminar el presupuesto "${budget.code}"?`
    );

    if (!hasConfirmed) {
      return;
    }

    try {
      await api.delete(`/budgets/${budget.id}/`);

      setBudgets((currentBudgets) =>
        currentBudgets.filter((currentBudget) => currentBudget.id !== budget.id)
      );
    } catch {
      alert("No se ha podido eliminar el presupuesto. Puede que tenga información asociada.");
    }
  }

  async function handleAddItem(data: {
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
  }) {
    if (!detailBudget) {
      return;
    }

    setIsSavingItem(true);

    try {
      await api.post<BudgetItem>("/budgets/items/", {
        budget: detailBudget.id,
        ...data,
      });

      await reloadBudget(detailBudget.id);
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleDeleteItem(item: BudgetItem) {
    if (!detailBudget) {
      return;
    }

    const hasConfirmed = window.confirm(`¿Eliminar el concepto "${item.description}"?`);

    if (!hasConfirmed) {
      return;
    }

    await api.delete(`/budgets/items/${item.id}/`);
    await reloadBudget(detailBudget.id);
  }

  async function handleConvertToJob() {
    if (!detailBudget) {
      return;
    }

    setIsConverting(true);

    try {
      await api.post(`/budgets/${detailBudget.id}/convert-to-job/`, {
        title: `Trabajo asociado a ${detailBudget.code}`,
      });

      await reloadBudget(detailBudget.id);
      await loadInitialData();

      alert("Presupuesto convertido en trabajo correctamente.");
    } catch {
      alert("Solo se pueden convertir presupuestos aceptados y no convertidos previamente.");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <section className="budgets-page">
      <div className="page-header budgets-page__header">
        <div>
          <h1 className="page-header__title">Gestión de presupuestos</h1>
          <p className="page-header__subtitle">
            Consulta y administra los presupuestos asociados a tus clientes
          </p>
        </div>

        <button className="budgets-page__create-button" type="button" onClick={openCreateModal}>
          <Plus size={18} />
          Nuevo presupuesto
        </button>
      </div>

      <section className="budgets-summary">
        <article className="card budgets-summary__card">
          <div>
            <p>Total presupuestos</p>
            <strong>{budgets.length}</strong>
          </div>
          <FileText size={22} />
        </article>

        <article className="card budgets-summary__card">
          <div>
            <p>Pendientes</p>
            <strong>{budgets.filter((budget) => budget.status === "PENDING").length}</strong>
          </div>
          <FileText size={22} />
        </article>

        <article className="card budgets-summary__card">
          <div>
            <p>Aceptados</p>
            <strong>{budgets.filter((budget) => budget.status === "ACCEPTED").length}</strong>
          </div>
          <FileText size={22} />
        </article>

        <article className="card budgets-summary__card">
          <div>
            <p>Importe total</p>
            <strong>
              {formatCurrency(
                budgets.reduce((total, budget) => total + Number(budget.total), 0)
              )}
            </strong>
          </div>
          <FileText size={22} />
        </article>
      </section>

      <section className="card budgets-card">
        <div className="budgets-toolbar">
          <div className="budgets-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar presupuesto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="budgets-toolbar__right">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as BudgetStatus | "ALL")}
            >
              <option value="ALL">Todos los estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="PENDING">Pendientes</option>
              <option value="ACCEPTED">Aceptados</option>
              <option value="REJECTED">Rechazados</option>
              <option value="CONVERTED">Convertidos</option>
            </select>

            <button className="budgets-filter-button" type="button">
              <SlidersHorizontal size={17} />
              Filtros
            </button>
          </div>
        </div>

        {isLoading && <p className="budgets-state">Cargando presupuestos...</p>}

        {!isLoading && errorMessage && (
          <p className="budgets-state budgets-state--error">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && (
          <>
            <div className="budgets-table-wrapper">
              <table className="budgets-table">
                <thead>
                  <tr>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Subtotal</th>
                    <th>IVA</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBudgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>
                        <div className="budgets-table__budget">
                          <div className="budgets-table__icon">
                            <FileText size={18} />
                          </div>

                          <div>
                            <strong>{budget.code}</strong>
                            <span>{budget.description || "Sin descripción"}</span>
                          </div>
                        </div>
                      </td>

                      <td>{budget.client_name}</td>
                      <td>{formatDate(budget.date)}</td>
                      <td>{formatCurrency(budget.subtotal)}</td>
                      <td>{formatCurrency(budget.vat_amount)}</td>
                      <td>
                        <strong>{formatCurrency(budget.total)}</strong>
                      </td>
                      <td>
                        <span className={statusClassNames[budget.status]}>
                          {statusLabels[budget.status]}
                        </span>
                      </td>
                      <td>
                        <div className="budgets-table__actions">
                          <button
                            type="button"
                            aria-label="Ver presupuesto"
                            onClick={() => openDetailModal(budget)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            aria-label="Editar presupuesto"
                            onClick={() => openEditModal(budget)}
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            type="button"
                            aria-label="Eliminar presupuesto"
                            onClick={() => handleDeleteBudget(budget)}
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

            {filteredBudgets.length === 0 && (
              <p className="budgets-state">
                No hay presupuestos que coincidan con la búsqueda.
              </p>
            )}

            <div className="budgets-footer">
              <p>
                Mostrando {filteredBudgets.length} de {budgets.length} presupuestos
              </p>

              <div className="budgets-pagination">
                <button type="button" disabled>
                  1
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <BudgetFormModal
        isOpen={isFormModalOpen}
        isSaving={isSavingBudget}
        budget={selectedBudget}
        clients={clients}
        onClose={closeFormModal}
        onSubmit={handleSubmitBudget}
      />

      <BudgetDetailModal
        isOpen={isDetailModalOpen}
        budget={detailBudget}
        isSavingItem={isSavingItem}
        isConverting={isConverting}
        onClose={closeDetailModal}
        onAddItem={handleAddItem}
        onDeleteItem={handleDeleteItem}
        onConvertToJob={handleConvertToJob}
      />
    </section>
  );
}