import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { PlaceholderPage } from "../components/ui/PlaceholderPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ClientsPage } from "../features/clients/pages/ClientsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/inicio" replace />} />
        <Route path="inicio" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />        
        <Route path="presupuestos" element={<PlaceholderPage title="Gestión de presupuestos" />} />
        <Route path="trabajos" element={<PlaceholderPage title="Gestión de trabajos" />} />
        <Route path="calendario" element={<PlaceholderPage title="Calendario / Planificación" />} />
        <Route path="materiales" element={<PlaceholderPage title="Gestión de materiales" />} />
        <Route path="alertas" element={<PlaceholderPage title="Alertas" />} />
        <Route path="facturacion" element={<PlaceholderPage title="Facturación" />} />
        <Route path="configuracion" element={<PlaceholderPage title="Configuración" />} />
      </Route>
    </Routes>
  );
}