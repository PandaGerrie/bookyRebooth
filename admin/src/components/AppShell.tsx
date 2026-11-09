import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { CMS_VERSION } from "../version";

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ENTITY_ADMIN: "Entiteit admin",
};

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "active" : undefined;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Booky CMS
          <span>Beheeromgeving</span>
        </div>

        <nav className="nav">
          <NavLink to="/" end className={navClass}>
            Overzicht
          </NavLink>

          <div className="nav-divider" aria-hidden="true" />

          {isSuper ? (
            <NavLink to="/entities" className={navClass}>
              Entiteiten
            </NavLink>
          ) : null}
          <NavLink to="/users" className={navClass}>
            Gebruikers
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            Algemene instellingen
          </NavLink>

          <div className="nav-divider" aria-hidden="true" />

          <NavLink to="/locations" className={navClass}>
            Locaties
          </NavLink>
          <NavLink to="/sellers" className={navClass}>
            Verkopers
          </NavLink>
          <NavLink to="/categories" className={navClass}>
            Categorieën
          </NavLink>

          <div className="nav-divider" aria-hidden="true" />

          <NavLink to="/new-flow" className={navClass}>
            Nieuwe flow
          </NavLink>

          {isSuper ? (
            <>
              <div className="nav-divider" aria-hidden="true" />
              <NavLink to="/product-sets" className={navClass}>
                Product Sets
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div>
            <div>{user?.email}</div>
            <div>{user ? roleLabel[user.role] : ""}</div>
            {user?.entity?.name ? <div>{user.entity.name}</div> : null}
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Uitloggen
          </button>
          <div className="sidebar-version">Booky CMS - V{CMS_VERSION}</div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
