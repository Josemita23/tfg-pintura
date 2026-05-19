import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../services/api";
import type { Alert } from "../../types/alert";

const todayText = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export function Topbar() {
  const navigate = useNavigate();
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
    <header className="topbar">
      <div />

      <div className="topbar__right">
        <button
          className="topbar__notification"
          type="button"
          aria-label={
            unreadAlertsCount > 0
              ? `Ver ${unreadAlertsCount} alertas pendientes`
              : "Ver alertas"
          }
          onClick={() => navigate("/alertas")}
        >
          <Bell size={18} />
          {unreadAlertsCount > 0 && <span>{unreadAlertsCount}</span>}
        </button>

        <p className="topbar__date">Hoy es {todayText}</p>
      </div>
    </header>
  );
}
