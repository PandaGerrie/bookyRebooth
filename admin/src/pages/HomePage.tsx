import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overzicht</h1>
          <p>Welkom in de beheeromgeving van Booky CMS.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body stack">
          <p>
            Je bent ingelogd als <strong>{user?.email}</strong>
            {user?.entity?.name ? (
              <>
                {" "}
                voor <strong>{user.entity.name}</strong>
              </>
            ) : null}
            .
          </p>

          {isSuper ? (
            <p className="muted">
              Als super admin beheer je entiteiten, algemene content en alle
              entiteit-data.
            </p>
          ) : (
            <p className="muted">
              Beheer locaties, verkopers en gebruikers van jouw entiteit.
            </p>
          )}

          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Link className="btn" to="/locations">
              Locaties
            </Link>
            <Link className="btn btn-secondary" to="/sellers">
              Verkopers
            </Link>
            {isSuper ? (
              <Link className="btn btn-secondary" to="/entities">
                Entiteiten
              </Link>
            ) : (
              <Link className="btn btn-secondary" to="/users">
                Gebruikers
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
