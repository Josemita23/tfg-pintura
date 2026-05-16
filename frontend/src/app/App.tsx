import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AlertsPage } from "../features/alerts/pages/AlertsPage";
import { BillingPage } from "../features/billing/pages/BillingPage";
import { BudgetsPage } from "../features/budgets/pages/BudgetsPage";
import { ClientDetailPage } from "../features/clients/pages/ClientDetailPage";
import { ClientsPage } from "../features/clients/pages/ClientsPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { JobsPage } from "../features/jobs/pages/JobsPage";
import { MaterialsPage } from "../features/materials/pages/MaterialsPage";
import { PlanningPage } from "../features/planning/pages/PlanningPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inicio" replace />} />
        <Route path="inicio" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/:clientId" element={<ClientDetailPage />} />
        <Route path="presupuestos" element={<BudgetsPage />} />
        <Route path="trabajos" element={<JobsPage />} />
        <Route path="/calendario" element={<PlanningPage />} />
        <Route path="/materiales" element={<MaterialsPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="facturacion" element={<BillingPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
