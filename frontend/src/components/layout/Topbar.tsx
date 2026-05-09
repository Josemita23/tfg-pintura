import { Bell } from "lucide-react";

export function Topbar() {
  return (
    <header className="topbar">
      <div />

      <div className="topbar__right">
        <button className="topbar__notification" type="button" aria-label="Ver notificaciones">
          <Bell size={18} />
          <span />
        </button>

        <p className="topbar__date">Hoy es 16 de junio de 2026</p>
      </div>
    </header>
  );
}