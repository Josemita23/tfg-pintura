import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Boxes,
    ClipboardList,
    Edit,
    Eye,
    Layers,
    PackageCheck,
    PackageX,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
} from "lucide-react";
import { api } from "../../../services/api";
import type {
    Material,
    MaterialConsumption,
    MaterialConsumptionPayload,
    MaterialPayload,
    MaterialStatus,
} from "../../../types/material";
import type { Job } from "../../../types/job";
import { MaterialConsumptionFormModal } from "../components/MaterialConsumptionFormModal";
import { MaterialFormModal } from "../components/MaterialFormModal";
import "../styles/MaterialsPage.css";

const statusLabels: Record<MaterialStatus, string> = {
    AVAILABLE: "Disponible",
    LOW_STOCK: "Stock bajo",
    OUT_OF_STOCK: "Agotado",
};

const statusClassNames: Record<MaterialStatus, string> = {
    AVAILABLE: "status-pill status-pill--success",
    LOW_STOCK: "status-pill status-pill--warning",
    OUT_OF_STOCK: "status-pill status-pill--danger",
};

function parseNumber(value: string) {
    return Number(value.replace(",", ".")) || 0;
}

function formatQuantity(material: Material) {
    return `${parseNumber(material.quantity_available).toLocaleString("es-ES")} ${material.unit
        }`;
}

function formatMoney(value: string) {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(parseNumber(value));
}

export function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<MaterialStatus | "ALL">(
        "ALL"
    );
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isSavingMaterial, setIsSavingMaterial] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([]);
    const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
    const [selectedConsumption, setSelectedConsumption] =
        useState<MaterialConsumption | null>(null);
    const [isSavingConsumption, setIsSavingConsumption] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    function notifyAlertsChanged() {
        window.dispatchEvent(new Event("alerts:changed"));
    }

    async function loadInitialData() {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const [materialsResponse, jobsResponse, consumptionsResponse] =
                await Promise.all([
                    api.get<Material[]>("/materials/"),
                    api.get<Job[]>("/jobs/"),
                    api.get<MaterialConsumption[]>("/materials/consumptions/"),
                ]);

            setMaterials(materialsResponse.data);
            setJobs(jobsResponse.data);
            setConsumptions(consumptionsResponse.data);
        } catch {
            setErrorMessage("No se han podido cargar los materiales.");
        } finally {
            setIsLoading(false);
        }
    }

    const filteredMaterials = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return materials.filter((material) => {
            const matchesStatus =
                selectedStatus === "ALL" || material.status === selectedStatus;

            const matchesSearch =
                normalizedSearch.length === 0 ||
                material.name.toLowerCase().includes(normalizedSearch) ||
                material.material_type.toLowerCase().includes(normalizedSearch) ||
                material.provider.toLowerCase().includes(normalizedSearch) ||
                material.unit.toLowerCase().includes(normalizedSearch);

            return matchesStatus && matchesSearch;
        });
    }, [materials, search, selectedStatus]);

    const lowStockMaterials = materials.filter(
        (material) => material.status === "LOW_STOCK"
    );

    const outOfStockMaterials = materials.filter(
        (material) => material.status === "OUT_OF_STOCK"
    );

    const totalInventoryValue = materials.reduce((total, material) => {
        return (
            total +
            parseNumber(material.quantity_available) * parseNumber(material.unit_price)
        );
    }, 0);

    function openCreateModal() {
        setSelectedMaterial(null);
        setIsFormModalOpen(true);
    }

    function openEditModal(material: Material) {
        setSelectedMaterial(material);
        setIsFormModalOpen(true);
    }

    function closeFormModal() {
        setSelectedMaterial(null);
        setIsFormModalOpen(false);
    }

    function openCreateConsumptionModal() {
        setSelectedConsumption(null);
        setIsConsumptionModalOpen(true);
    }

    function openEditConsumptionModal(consumption: MaterialConsumption) {
        setSelectedConsumption(consumption);
        setIsConsumptionModalOpen(true);
    }

    function closeConsumptionModal() {
        setSelectedConsumption(null);
        setIsConsumptionModalOpen(false);
    }

    async function handleSubmitConsumption(data: MaterialConsumptionPayload) {
        setIsSavingConsumption(true);

        try {
            if (selectedConsumption) {
                await api.patch<MaterialConsumption>(
                    `/materials/consumptions/${selectedConsumption.id}/`,
                    data
                );
            } else {
                await api.post<MaterialConsumption>("/materials/consumptions/", data);
            }

            await loadInitialData();
            notifyAlertsChanged();
            closeConsumptionModal();
        } finally {
            setIsSavingConsumption(false);
        }
    }

    async function handleDeleteConsumption(consumption: MaterialConsumption) {
        const hasConfirmed = window.confirm(
            `¿Seguro que quieres eliminar el consumo de "${consumption.material_name}"? Se restaurará el stock del material.`
        );

        if (!hasConfirmed) {
            return;
        }

        try {
            await api.delete(`/materials/consumptions/${consumption.id}/`);
            await loadInitialData();
            notifyAlertsChanged();
        } catch {
            window.alert("No se ha podido eliminar el consumo.");
        }
    }

    async function handleSubmitMaterial(data: MaterialPayload) {
        setIsSavingMaterial(true);

        try {
            if (selectedMaterial) {
                const response = await api.patch<Material>(
                    `/materials/${selectedMaterial.id}/`,
                    data
                );

                setMaterials((currentMaterials) =>
                    currentMaterials.map((material) =>
                        material.id === selectedMaterial.id ? response.data : material
                    )
                );
            } else {
                const response = await api.post<Material>("/materials/", data);

                setMaterials((currentMaterials) => [response.data, ...currentMaterials]);
            }

            notifyAlertsChanged();
            closeFormModal();
        } finally {
            setIsSavingMaterial(false);
        }
    }

    async function handleDeleteMaterial(material: Material) {
        const hasConfirmed = window.confirm(
            `¿Seguro que quieres eliminar el material "${material.name}"?`
        );

        if (!hasConfirmed) {
            return;
        }

        try {
            await api.delete(`/materials/${material.id}/`);

            setMaterials((currentMaterials) =>
                currentMaterials.filter(
                    (currentMaterial) => currentMaterial.id !== material.id
                )
            );
        } catch {
            alert(
                "No se ha podido eliminar el material. Puede que tenga consumos asociados a trabajos."
            );
        }
    }

    function handleViewMaterial(material: Material) {
        alert(
            [
                `Material: ${material.name}`,
                `Tipo: ${material.material_type || "Sin tipo"}`,
                `Proveedor: ${material.provider || "Sin proveedor"}`,
                `Stock: ${formatQuantity(material)}`,
                `Stock mínimo: ${parseNumber(material.minimum_stock).toLocaleString(
                    "es-ES"
                )} ${material.unit}`,
                `Precio unitario: ${formatMoney(material.unit_price)}`,
                `Estado: ${statusLabels[material.status]}`,
                `Observaciones: ${material.notes || "Sin observaciones"}`,
            ].join("\n")
        );
    }

    return (
        <section className="materials-page">
            <div className="materials-page__header page-header">
                <div>
                    <h1 className="page-header__title">Gestión de materiales</h1>
                    <p className="page-header__subtitle">
                        Consulta y administra todos los materiales del inventario
                    </p>
                </div>

                <button
                    type="button"
                    className="materials-page__create-button"
                    onClick={openCreateModal}
                >
                    <Plus size={18} />
                    Nuevo material
                </button>
            </div>

            <div className="materials-summary">
                <article className="materials-summary__card card">
                    <div>
                        <p>Total materiales</p>
                        <strong>{materials.length}</strong>
                    </div>
                    <Layers size={22} />
                </article>

                <article className="materials-summary__card card">
                    <div>
                        <p>Disponibles</p>
                        <strong>
                            {materials.filter((material) => material.status === "AVAILABLE").length}
                        </strong>
                    </div>
                    <PackageCheck size={22} />
                </article>

                <article className="materials-summary__card card">
                    <div>
                        <p>Stock bajo</p>
                        <strong>{lowStockMaterials.length}</strong>
                    </div>
                    <AlertTriangle size={22} />
                </article>

                <article className="materials-summary__card card">
                    <div>
                        <p>Agotados</p>
                        <strong>{outOfStockMaterials.length}</strong>
                    </div>
                    <PackageX size={22} />
                </article>
            </div>

            <section className="materials-card card">
                <div className="materials-toolbar">
                    <label className="materials-search">
                        <Search size={18} />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar material..."
                        />
                    </label>

                    <div className="materials-toolbar__right">
                        <select
                            value={selectedStatus}
                            onChange={(event) =>
                                setSelectedStatus(event.target.value as MaterialStatus | "ALL")
                            }
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="AVAILABLE">Disponibles</option>
                            <option value="LOW_STOCK">Stock bajo</option>
                            <option value="OUT_OF_STOCK">Agotados</option>
                        </select>

                        <button type="button" className="materials-filter-button">
                            <SlidersHorizontal size={16} />
                            Filtros
                        </button>
                    </div>
                </div>

                {isLoading && <p className="materials-state">Cargando materiales...</p>}

                {!isLoading && errorMessage && (
                    <p className="materials-state materials-state--error">
                        {errorMessage}
                    </p>
                )}

                {!isLoading && !errorMessage && (
                    <>
                        <div className="materials-table-wrapper">
                            <table className="materials-table">
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Proveedor</th>
                                        <th>Stock</th>
                                        <th>Stock mínimo</th>
                                        <th>Precio</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredMaterials.map((material) => (
                                        <tr key={material.id}>
                                            <td>
                                                <div className="materials-table__material">
                                                    <span className="materials-table__icon">
                                                        <Boxes size={18} />
                                                    </span>

                                                    <div>
                                                        <strong>{material.name}</strong>
                                                        <span>{material.material_type || "Sin tipo"}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{material.provider || "Sin proveedor"}</td>

                                            <td>{formatQuantity(material)}</td>

                                            <td>
                                                {parseNumber(material.minimum_stock).toLocaleString(
                                                    "es-ES"
                                                )}{" "}
                                                {material.unit}
                                            </td>

                                            <td>{formatMoney(material.unit_price)}</td>

                                            <td>
                                                <span className={statusClassNames[material.status]}>
                                                    {statusLabels[material.status]}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="materials-table__actions">
                                                    <button
                                                        type="button"
                                                        title="Ver material"
                                                        onClick={() => handleViewMaterial(material)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Editar material"
                                                        onClick={() => openEditModal(material)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar material"
                                                        onClick={() => handleDeleteMaterial(material)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredMaterials.length === 0 && (
                                <p className="materials-state">
                                    No hay materiales que coincidan con la búsqueda.
                                </p>
                            )}
                        </div>

                        <footer className="materials-footer">
                            <p>
                                Mostrando {filteredMaterials.length} de {materials.length} materiales
                            </p>

                            <p>
                                Valor estimado del inventario:{" "}
                                <strong>{formatMoney(String(totalInventoryValue))}</strong>
                            </p>
                        </footer>
                    </>
                )}
            </section>

            <section className="materials-card materials-consumptions-card card">
                <div className="materials-consumptions__header">
                    <div>
                        <h2>Consumo de materiales por trabajo</h2>
                        <p>
                            Registra los materiales utilizados en cada trabajo para actualizar el
                            stock automáticamente
                        </p>
                    </div>

                    <button
                        type="button"
                        className="materials-page__create-button"
                        onClick={openCreateConsumptionModal}
                    >
                        <Plus size={18} />
                        Registrar consumo
                    </button>
                </div>

                <div className="materials-table-wrapper">
                    <table className="materials-table">
                        <thead>
                            <tr>
                                <th>Trabajo</th>
                                <th>Material</th>
                                <th>Cantidad</th>
                                <th>Fecha</th>
                                <th>Observaciones</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {consumptions.map((consumption) => {
                                const material = materials.find(
                                    (currentMaterial) => currentMaterial.id === consumption.material
                                );

                                return (
                                    <tr key={consumption.id}>
                                        <td>
                                            <div className="materials-table__material">
                                                <span className="materials-table__icon">
                                                    <ClipboardList size={18} />
                                                </span>

                                                <div>
                                                    <strong>{consumption.job_title}</strong>
                                                    <span>Trabajo asociado</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>{consumption.material_name}</td>

                                        <td>
                                            {parseNumber(consumption.quantity).toLocaleString("es-ES")}{" "}
                                            {material?.unit ?? ""}
                                        </td>

                                        <td>
                                            {new Intl.DateTimeFormat("es-ES").format(
                                                new Date(consumption.consumption_date)
                                            )}
                                        </td>

                                        <td>{consumption.notes || "Sin observaciones"}</td>

                                        <td>
                                            <div className="materials-table__actions">
                                                <button
                                                    type="button"
                                                    title="Editar consumo"
                                                    onClick={() => openEditConsumptionModal(consumption)}
                                                >
                                                    <Edit size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    title="Eliminar consumo"
                                                    onClick={() => handleDeleteConsumption(consumption)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {consumptions.length === 0 && (
                        <p className="materials-state">
                            Todavía no hay consumos de materiales registrados.
                        </p>
                    )}
                </div>
            </section>

            <MaterialFormModal
                isOpen={isFormModalOpen}
                isSaving={isSavingMaterial}
                material={selectedMaterial}
                onClose={closeFormModal}
                onSubmit={handleSubmitMaterial}
            />

            <MaterialConsumptionFormModal
                isOpen={isConsumptionModalOpen}
                isSaving={isSavingConsumption}
                consumption={selectedConsumption}
                jobs={jobs}
                materials={materials}
                onClose={closeConsumptionModal}
                onSubmit={handleSubmitConsumption}
            />
        </section>
    );
}