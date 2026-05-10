import { Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Budget, BudgetItem } from "../../../types/budget";
import "./BudgetDetailModal.css";

type BudgetItemFormData = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type BudgetDetailModalProps = {
  isOpen: boolean;
  budget: Budget | null;
  isSavingItem: boolean;
  isConverting: boolean;
  onClose: () => void;
  onAddItem: (data: BudgetItemFormData) => Promise<void>;
  onDeleteItem: (item: BudgetItem) => Promise<void>;
  onConvertToJob: () => Promise<void>;
};

const initialItemFormData: BudgetItemFormData = {
  description: "",
  quantity: "1.00",
  unit: "unidad",
  unit_price: "0.00",
};

const statusLabels = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  CONVERTED: "Convertido",
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

export function BudgetDetailModal({
  isOpen,
  budget,
  isSavingItem,
  isConverting,
  onClose,
  onAddItem,
  onDeleteItem,
  onConvertToJob,
}: BudgetDetailModalProps) {
  const [itemFormData, setItemFormData] = useState<BudgetItemFormData>(initialItemFormData);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !budget) {
    return null;
  }

  const handleChange = (field: keyof BudgetItemFormData, value: string) => {
    setItemFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSubmitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!itemFormData.description.trim()) {
      setErrorMessage("La descripción del concepto es obligatoria.");
      return;
    }

    if (Number(itemFormData.quantity) <= 0) {
      setErrorMessage("La cantidad debe ser mayor que cero.");
      return;
    }

    if (Number(itemFormData.unit_price) < 0) {
      setErrorMessage("El precio unitario no puede ser negativo.");
      return;
    }

    try {
      await onAddItem(itemFormData);
      setItemFormData(initialItemFormData);
    } catch {
      setErrorMessage("No se ha podido añadir el concepto.");
    }
  };

  return (
    <div className="budget-detail-backdrop">
      <section className="budget-detail-modal">
        <header className="budget-detail-modal__header">
          <div>
            <h2>{budget.code}</h2>
            <p>{budget.client_name}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Cerrar detalle">
            <X size={20} />
          </button>
        </header>

        <div className="budget-detail-modal__content">
          <section className="budget-detail-summary">
            <article>
              <span>Fecha</span>
              <strong>{formatDate(budget.date)}</strong>
            </article>

            <article>
              <span>Estado</span>
              <strong>{statusLabels[budget.status]}</strong>
            </article>

            <article>
              <span>Subtotal</span>
              <strong>{formatCurrency(budget.subtotal)}</strong>
            </article>

            <article>
              <span>IVA</span>
              <strong>{formatCurrency(budget.vat_amount)}</strong>
            </article>

            <article>
              <span>Total</span>
              <strong>{formatCurrency(budget.total)}</strong>
            </article>
          </section>

          <section className="budget-detail-description">
            <h3>Descripción</h3>
            <p>{budget.description || "Sin descripción registrada."}</p>
          </section>

          <section className="budget-detail-items">
            <div className="budget-detail-items__header">
              <div>
                <h3>Conceptos del presupuesto</h3>
                <p>Añade los trabajos o materiales incluidos en el presupuesto</p>
              </div>
            </div>

            <form className="budget-item-form" onSubmit={handleSubmitItem}>
              <input
                type="text"
                value={itemFormData.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Descripción del concepto"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                value={itemFormData.quantity}
                onChange={(event) => handleChange("quantity", event.target.value)}
                placeholder="Cantidad"
              />

              <input
                type="text"
                value={itemFormData.unit}
                onChange={(event) => handleChange("unit", event.target.value)}
                placeholder="Unidad"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                value={itemFormData.unit_price}
                onChange={(event) => handleChange("unit_price", event.target.value)}
                placeholder="Precio"
              />

              <button type="submit" disabled={isSavingItem}>
                <Plus size={16} />
                Añadir
              </button>
            </form>

            {errorMessage && <p className="budget-detail-error">{errorMessage}</p>}

            <div className="budget-detail-table-wrapper">
              <table className="budget-detail-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio</th>
                    <th>Importe</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {(budget.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>
                        <button
                          className="budget-detail-table__delete"
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          aria-label="Eliminar concepto"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(budget.items ?? []).length === 0 && (
              <p className="budget-detail-empty">Este presupuesto todavía no tiene conceptos.</p>
            )}
          </section>

          <footer className="budget-detail-actions">
            <button className="budget-detail-actions__secondary" type="button" onClick={onClose}>
              Cerrar
            </button>

            <button
              className="budget-detail-actions__primary"
              type="button"
              onClick={onConvertToJob}
              disabled={budget.status !== "ACCEPTED" || isConverting}
            >
              {isConverting ? "Convirtiendo..." : "Convertir en trabajo"}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}