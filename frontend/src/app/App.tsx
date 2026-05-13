import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { PlaceholderPage } from "../components/ui/PlaceholderPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ClientsPage } from "../features/clients/pages/ClientsPage";
import { ClientDetailPage } from "../features/clients/pages/ClientDetailPage";
import { BudgetsPage } from "../features/budgets/pages/BudgetsPage";
import { JobsPage } from "../features/jobs/pages/JobsPage";
import { PlanningPage } from "../features/planning/pages/PlanningPage";
import { MaterialsPage } from "../features/materials/pages/MaterialsPage";

export default function App() {
 return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/inicio" replace />} />
        <Route path="inicio" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/:clientId" element={<ClientDetailPage />} />
        <Route path="presupuestos" element={<BudgetsPage />} />
        <Route path="trabajos" element={<JobsPage />} />
        <Route path="/calendario" element={<PlanningPage />} />
        <Route path="/materiales" element={<MaterialsPage />} />
        <Route path="alertas" element={<PlaceholderPage title="Alertas" />} />
        <Route path="facturacion" element={<PlaceholderPage title="Facturación" />} />
        <Route path="configuracion" element={<PlaceholderPage title="Configuración" />} />
      </Route>
    </Routes>
  );
}