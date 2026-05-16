import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../../services/api";
import type { Budget, BudgetItem } from "../../../types/budget";
import "./BudgetDetailModal.css";

type BudgetItemFormData = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type BudgetBasePrice = {
  id: number;
  name: string;
  description: string;
  unit: string;
  unit_price: string;
  is_active: boolean;
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
  quantity: "",
  unit: "",
  unit_price: "",
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
  const [basePrices, setBasePrices] = useState<BudgetBasePrice[]>([]);
  const [selectedBasePriceId, setSelectedBasePriceId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    api
      .get<BudgetBasePrice[]>("/budgets/base-prices/")
      .then((response) => {
        setBasePrices(response.data.filter((basePrice) => basePrice.is_active));
      })
      .catch(() => {
        setBasePrices([]);
      });
  }, [isOpen]);

  if (!isOpen || !budget) {
    return null;
  }

  const handleChange = (field: keyof BudgetItemFormData, value: string) => {
    setItemFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleBasePriceChange = (basePriceId: string) => {
    setSelectedBasePriceId(basePriceId);

    const selectedBasePrice = basePrices.find(
      (basePrice) => String(basePrice.id) === basePriceId
    );

    if (!selectedBasePrice) {
      return;
    }

    setItemFormData((currentData) => ({
      ...currentData,
      description: selectedBasePrice.description,
      unit: selectedBasePrice.unit,
      unit_price: selectedBasePrice.unit_price,
    }));
  };

  const handleBasePriceValueChange = (basePriceId: number, unitPrice: string) => {
    setBasePrices((currentBasePrices) =>
      currentBasePrices.map((basePrice) =>
        basePrice.id === basePriceId ? { ...basePrice, unit_price: unitPrice } : basePrice
      )
    );

    if (selectedBasePriceId === String(basePriceId)) {
      setItemFormData((currentData) => ({
        ...currentData,
        unit_price: unitPrice,
      }));
    }
  };

  const saveBasePrice = async (basePrice: BudgetBasePrice) => {
    if (!basePrice.unit_price || Number(basePrice.unit_price) < 0) {
      return;
    }

    try {
      await api.patch<BudgetBasePrice>(`/budgets/base-prices/${basePrice.id}/`, {
        unit_price: basePrice.unit_price,
      });
    } catch {
      setErrorMessage("No se ha podido guardar el precio base.");
    }
  };

  const handleSubmitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!itemFormData.description.trim()) {
      setErrorMessage("La descripción del concepto es obligatoria.");
      return;
    }

    if (!itemFormData.quantity || Number(itemFormData.quantity) <= 0) {
      setErrorMessage("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!itemFormData.unit_price) {
      setErrorMessage("El precio unitario es obligatorio.");
      return;
    }

    if (Number(itemFormData.unit_price) < 0) {
      setErrorMessage("El precio unitario no puede ser negativo.");
      return;
    }

    try {
      await onAddItem(itemFormData);
      setItemFormData(initialItemFormData);
      setSelectedBasePriceId("");
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

            <section className="budget-base-prices">
              <label className="budget-base-prices__select">
                <span>Trabajo habitual</span>
                <select
                  value={selectedBasePriceId}
                  onChange={(event) => handleBasePriceChange(event.target.value)}
                >
                  <option value="">Seleccionar trabajo</option>
                  {basePrices.map((basePrice) => (
                    <option key={basePrice.id} value={basePrice.id}>
                      {basePrice.name} - {formatCurrency(basePrice.unit_price)} / {basePrice.unit}
                    </option>
                  ))}
                </select>
              </label>

              <div className="budget-base-prices__grid">
                {basePrices.map((basePrice) => (
                  <label key={basePrice.id}>
                    <span>{basePrice.name}</span>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={basePrice.unit_price}
                        onChange={(event) =>
                          handleBasePriceValueChange(basePrice.id, event.target.value)
                        }
                        onBlur={() => saveBasePrice(basePrice)}
                      />
                      <small>EUR/{basePrice.unit}</small>
                    </div>
                  </label>
                ))}
              </div>
            </section>

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
                placeholder="Metros / cantidad"
              />

              <input
                type="text"
                value={itemFormData.unit}
                onChange={(event) => handleChange("unit", event.target.value)}
                placeholder="Unidad (opcional)"
              />

              <label className="budget-item-form__money">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemFormData.unit_price}
                  onChange={(event) => handleChange("unit_price", event.target.value)}
                  placeholder="Precio"
                />
                <span>EUR</span>
              </label>

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
