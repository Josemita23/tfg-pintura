import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  FileText,
  Home,
  Layers,
  Paintbrush,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { api } from "../../services/api";
import type { Alert } from "../../types/alert";

const menuItems = [
  { label: "Inicio", path: "/inicio", icon: Home },
  { label: "Clientes", path: "/clientes", icon: Users },
  { label: "Presupuestos", path: "/presupuestos", icon: FileText },
  { label: "Trabajos", path: "/trabajos", icon: Briefcase },
  { label: "Calendario", path: "/calendario", icon: CalendarDays },
  { label: "Materiales", path: "/materiales", icon: Layers },
  { label: "Alertas", path: "/alertas", icon: AlertTriangle },
  { label: "Facturación", path: "/facturacion", icon: WalletCards },
  { label: "Configuración", path: "/configuracion", icon: Settings },
];

export function Sidebar() {
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  async function loadUnreadAlertsCount() {
    try {
      const response = await api.get<Alert[]>("/alerts/");
      const unreadCount = response.data.filter((alert) => !alert.is_read).length;

      setUnreadAlertsCount(unreadCount);
    } catch {
      setUnreadAlertsCount(0);
    }
  }

  useEffect(() => {
    loadUnreadAlertsCount();

    window.addEventListener("alerts:changed", loadUnreadAlertsCount);

    return () => {
      window.removeEventListener("alerts:changed", loadUnreadAlertsCount);
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Paintbrush size={20} />
        </div>

        <div>
          <p className="sidebar__title">Pintura+</p>
          <p className="sidebar__subtitle">Gestión de trabajos</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>

              {item.path === "/alertas" && unreadAlertsCount > 0 && (
                <span className="sidebar__badge">{unreadAlertsCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__avatar">ML</div>
        <div>
          <p className="sidebar__user-name">Manuel López</p>
          <p className="sidebar__user-role">Profesional</p>
        </div>
      </div>
    </aside>
  );
}
