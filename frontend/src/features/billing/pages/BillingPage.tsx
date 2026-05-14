import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Calendar,
  Euro,
  Layers,
  LineChart,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { api } from "../../../services/api";
import type { Budget } from "../../../types/budget";
import type { Job } from "../../../types/job";
import type { Material, MaterialConsumption } from "../../../types/material";
import "../styles/BillingPage.css";

const statusLabels: Record<Job["status"], string> = {
  PENDING: "Pendiente",
  PLANNED: "Planificado",
  IN_PROGRESS: "En progreso",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

const statusClassNames: Record<Job["status"], string> = {
  PENDING: "status-pill status-pill--warning",
  PLANNED: "status-pill status-pill--info",
  IN_PROGRESS: "status-pill status-pill--success",
  FINISHED: "status-pill status-pill--success",
  CANCELLED: "status-pill status-pill--danger",
};

function parseNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES").format(new Date(value));
}

function getMonthKey(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 7);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function getJobDate(job: Job) {
  return job.end_date || job.start_date || job.created_at;
}

function getInvoiceState(job: { revenue: number; status: Job["status"] }) {
  if (job.revenue <= 0) {
    return "Sin base";
  }

  if (job.status === "FINISHED") {
    return "Listo para facturar";
  }

  return "En seguimiento";
}

export function BillingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [jobsResponse, budgetsResponse, materialsResponse, consumptionsResponse] =
        await Promise.all([
          api.get<Job[]>("/jobs/"),
          api.get<Budget[]>("/budgets/"),
          api.get<Material[]>("/materials/"),
          api.get<MaterialConsumption[]>("/materials/consumptions/"),
        ]);

      setJobs(jobsResponse.data);
      setBudgets(budgetsResponse.data);
      setMaterials(materialsResponse.data);
      setConsumptions(consumptionsResponse.data);
    } catch {
      setErrorMessage("No se han podido cargar los datos de facturación.");
    } finally {
      setIsLoading(false);
    }
  }

  const financeData = useMemo(() => {
    const budgetById = new Map(budgets.map((budget) => [budget.id, budget]));
    const materialById = new Map(materials.map((material) => [material.id, material]));
    const consumptionsByJob = new Map<number, MaterialConsumption[]>();

    consumptions.forEach((consumption) => {
      const currentConsumptions = consumptionsByJob.get(consumption.job) ?? [];
      consumptionsByJob.set(consumption.job, [...currentConsumptions, consumption]);
    });

    return jobs
      .filter((job) => job.status !== "CANCELLED")
      .map((job) => {
        const budget = job.budget ? budgetById.get(job.budget) : null;
        const isValuedBudget = budget && ["ACCEPTED", "CONVERTED"].includes(budget.status);
        const jobConsumptions = consumptionsByJob.get(job.id) ?? [];
        const materialCost = jobConsumptions.reduce((total, consumption) => {
          const material = materialById.get(consumption.material);
          const quantity = parseNumber(consumption.quantity);
          const unitPrice = parseNumber(material?.unit_price);

          return total + quantity * unitPrice;
        }, 0);
        const revenue = isValuedBudget ? parseNumber(budget.subtotal) : 0;
        const vatAmount = isValuedBudget ? parseNumber(budget.vat_amount) : 0;
        const profit = revenue - materialCost;

        return {
          id: job.id,
          title: job.title,
          clientName: job.client_name,
          date: getJobDate(job),
          status: job.status,
          budgetCode: budget?.code ?? "Sin presupuesto",
          revenue,
          vatAmount,
          materialCost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        };
      });
  }, [budgets, consumptions, jobs, materials]);

  const monthOptions = useMemo(() => {
    const monthKeys = new Set<string>([selectedMonth, getCurrentMonthKey()]);

    financeData.forEach((job) => {
      const monthKey = getMonthKey(job.date);

      if (monthKey) {
        monthKeys.add(monthKey);
      }
    });

    consumptions.forEach((consumption) => {
      const monthKey = getMonthKey(consumption.consumption_date);

      if (monthKey) {
        monthKeys.add(monthKey);
      }
    });

    return Array.from(monthKeys).sort().reverse();
  }, [consumptions, financeData, selectedMonth]);

  const selectedMonthJobs = useMemo(
    () => financeData.filter((job) => getMonthKey(job.date) === selectedMonth),
    [financeData, selectedMonth]
  );

  const selectedMonthConsumptions = useMemo(
    () =>
      consumptions.filter(
        (consumption) => getMonthKey(consumption.consumption_date) === selectedMonth
      ),
    [consumptions, selectedMonth]
  );

  const monthlySummary = useMemo(() => {
    const revenue = selectedMonthJobs.reduce((total, job) => total + job.revenue, 0);
    const materialCost = selectedMonthJobs.reduce((total, job) => total + job.materialCost, 0);
    const realJobs = selectedMonthJobs.filter((job) => job.status === "FINISHED");
    const realRevenue = realJobs.reduce((total, job) => total + job.revenue, 0);
    const realMaterialCost = realJobs.reduce((total, job) => total + job.materialCost, 0);
    const profit = revenue - materialCost;
    const realProfit = realRevenue - realMaterialCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      materialCost,
      profit,
      realProfit,
      margin,
      jobsCount: selectedMonthJobs.length,
      finishedJobsCount: realJobs.length,
      consumptionsCount: selectedMonthConsumptions.length,
    };
  }, [selectedMonthConsumptions.length, selectedMonthJobs]);

  const monthlyTrend = useMemo(() => {
    const months = monthOptions.slice(0, 6).reverse();

    return months.map((monthKey) => {
      const monthJobs = financeData.filter((job) => getMonthKey(job.date) === monthKey);
      const revenue = monthJobs.reduce((total, job) => total + job.revenue, 0);
      const materialCost = monthJobs.reduce((total, job) => total + job.materialCost, 0);

      return {
        monthKey,
        label: getMonthLabel(monthKey).slice(0, 3),
        revenue,
        materialCost,
        profit: revenue - materialCost,
      };
    });
  }, [financeData, monthOptions]);

  const maxTrendValue = Math.max(
    ...monthlyTrend.map((month) => Math.max(month.revenue, month.materialCost, month.profit)),
    1
  );

  const topJobs = [...selectedMonthJobs].sort(
    (firstJob, secondJob) => secondJob.profit - firstJob.profit
  );
  const jobsWithoutBudget = selectedMonthJobs.filter((job) => job.revenue === 0).length;
  const riskyJobs = selectedMonthJobs.filter((job) => job.revenue > 0 && job.margin < 25).length;
  const readyToInvoiceJobs = selectedMonthJobs.filter(
    (job) => job.status === "FINISHED" && job.revenue > 0
  ).length;
  const pendingRevenue = selectedMonthJobs
    .filter((job) => job.status !== "FINISHED" && job.revenue > 0)
    .reduce((total, job) => total + job.revenue, 0);

  return (
    <section className="billing-page">
      <div className="page-header billing-page__header">
        <div>
          <h1 className="page-header__title">Facturación</h1>
          <p className="page-header__subtitle">
            Resumen económico de trabajos, materiales y beneficio mensual
          </p>
        </div>

        <label className="billing-month-select">
          <Calendar size={17} />
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {monthOptions.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {getMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="billing-state">Cargando datos de facturación...</p>}

      {!isLoading && errorMessage && (
        <p className="billing-state billing-state--error">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && (
        <>
          <section className="billing-summary">
            <article className="card billing-summary__card billing-summary__card--revenue">
              <div>
                <p>Ingresos sin IVA</p>
                <strong>{formatMoney(monthlySummary.revenue)}</strong>
                <span>{monthlySummary.jobsCount} trabajos valorados en el mes</span>
              </div>
              <ArrowUpRight size={23} />
            </article>

            <article className="card billing-summary__card billing-summary__card--cost">
              <div>
                <p>Gasto en materiales</p>
                <strong>{formatMoney(monthlySummary.materialCost)}</strong>
                <span>{monthlySummary.consumptionsCount} consumos registrados</span>
              </div>
              <ArrowDownRight size={23} />
            </article>

            <article className="card billing-summary__card billing-summary__card--profit">
              <div>
                <p>Beneficio estimado</p>
                <strong>{formatMoney(monthlySummary.profit)}</strong>
                <span>Margen {monthlySummary.margin.toFixed(1)}%</span>
              </div>
              <TrendingUp size={23} />
            </article>

            <article className="card billing-summary__card billing-summary__card--real">
              <div>
                <p>Beneficio real cerrado</p>
                <strong>{formatMoney(monthlySummary.realProfit)}</strong>
                <span>{monthlySummary.finishedJobsCount} trabajos finalizados</span>
              </div>
              <ReceiptText size={23} />
            </article>
          </section>

          <section className="billing-grid">
            <article className="card billing-panel billing-panel--wide">
              <div className="billing-panel__header">
                <div>
                  <h2>Evolución de los últimos meses</h2>
                  <p>Comparativa de base imponible, coste de materiales y beneficio.</p>
                </div>
                <LineChart size={20} />
              </div>

              <div className="billing-chart">
                {monthlyTrend.map((month) => (
                  <div className="billing-chart__month" key={month.monthKey}>
                    <div className="billing-chart__bars">
                      <span
                        className="billing-chart__bar billing-chart__bar--revenue"
                        style={{ height: `${Math.max((month.revenue / maxTrendValue) * 100, 4)}%` }}
                        title={`Ingresos sin IVA: ${formatMoney(month.revenue)}`}
                      />
                      <span
                        className="billing-chart__bar billing-chart__bar--cost"
                        style={{
                          height: `${Math.max((month.materialCost / maxTrendValue) * 100, 4)}%`,
                        }}
                        title={`Materiales: ${formatMoney(month.materialCost)}`}
                      />
                      <span
                        className="billing-chart__bar billing-chart__bar--profit"
                        style={{
                          height: `${Math.max(
                            (Math.max(month.profit, 0) / maxTrendValue) * 100,
                            4
                          )}%`,
                        }}
                        title={`Beneficio: ${formatMoney(month.profit)}`}
                      />
                    </div>
                    <strong>{month.label}</strong>
                  </div>
                ))}
              </div>

              <div className="billing-chart__legend">
                <span>
                  <i className="billing-dot billing-dot--revenue" />
                  Ingresos sin IVA
                </span>
                <span>
                  <i className="billing-dot billing-dot--cost" />
                  Materiales
                </span>
                <span>
                  <i className="billing-dot billing-dot--profit" />
                  Beneficio
                </span>
              </div>
            </article>

            <article className="card billing-panel">
              <div className="billing-panel__header">
                <div>
                  <h2>Lectura rápida</h2>
                  <p>Señales útiles para revisar antes de facturar.</p>
                </div>
                <Euro size={20} />
              </div>

              <div className="billing-insights">
                <div>
                  <strong>{jobsWithoutBudget}</strong>
                  <span>trabajos del mes sin presupuesto aceptado o convertido</span>
                </div>
                <div>
                  <strong>{readyToInvoiceJobs}</strong>
                  <span>trabajos finalizados con base económica lista para factura</span>
                </div>
                <div>
                  <strong>{riskyJobs}</strong>
                  <span>trabajos con margen por debajo del 25%</span>
                </div>
                <div>
                  <strong>
                    {formatMoney(monthlySummary.materialCost / Math.max(monthlySummary.jobsCount, 1))}
                  </strong>
                  <span>coste medio de material por trabajo</span>
                </div>
                <div>
                  <strong>{formatMoney(pendingRevenue)}</strong>
                  <span>base todavía no cerrada porque el trabajo sigue abierto</span>
                </div>
              </div>
            </article>
          </section>

          <section className="card billing-card">
            <div className="billing-card__header">
              <div>
                <h2>Rentabilidad por trabajo</h2>
                <p>Base del presupuesto frente al material consumido en cada trabajo.</p>
              </div>
            </div>

            <div className="billing-table-wrapper">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Trabajo</th>
                    <th>Fecha</th>
                    <th>Presupuesto</th>
                    <th>Base sin IVA</th>
                    <th>IVA</th>
                    <th>Materiales</th>
                    <th>Beneficio</th>
                    <th>Margen</th>
                    <th>Factura</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {topJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="billing-table__job">
                          <div className="billing-table__icon">
                            <BriefcaseBusiness size={18} />
                          </div>
                          <div>
                            <strong>{job.title}</strong>
                            <span>{job.clientName}</span>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(job.date)}</td>
                      <td>{job.budgetCode}</td>
                      <td>{formatMoney(job.revenue)}</td>
                      <td>{formatMoney(job.vatAmount)}</td>
                      <td>
                        <span className="billing-table__cost">
                          <Layers size={14} />
                          {formatMoney(job.materialCost)}
                        </span>
                      </td>
                      <td>
                        <strong className={job.profit < 0 ? "billing-negative" : "billing-positive"}>
                          {formatMoney(job.profit)}
                        </strong>
                      </td>
                      <td>{job.revenue > 0 ? `${job.margin.toFixed(1)}%` : "Sin dato"}</td>
                      <td>
                        <span className="billing-invoice-state">{getInvoiceState(job)}</span>
                      </td>
                      <td>
                        <span className={statusClassNames[job.status]}>{statusLabels[job.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {topJobs.length === 0 && (
              <p className="billing-state">No hay trabajos con fecha en {getMonthLabel(selectedMonth)}.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
