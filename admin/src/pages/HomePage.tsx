import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Entity } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type BreakdownRow = {
  id: string;
  name: string;
  count: number;
};

type StatsOverview = {
  days: number;
  entityId: string | null;
  from: string;
  to: string;
  health: {
    notFound404: number;
    formSubmitError: number;
    emailError: number;
    makeError: number;
    makeComingSoon: true;
  };
  analytics: {
    successfulSubmissions: number;
    bySeller: BreakdownRow[];
    byLocation: BreakdownRow[];
    byCategory: BreakdownRow[];
  };
};

function BreakdownTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: BreakdownRow[];
  emptyLabel: string;
}) {
  return (
    <div className="panel">
      <div className="panel-body stack">
        <h3 style={{ margin: 0, fontSize: "1rem" }}>{title}</h3>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {emptyLabel}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Naam</th>
                <th style={{ width: 88, textAlign: "right" }}>Aantal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td style={{ textAlign: "right" }}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filterEntityId, setFilterEntityId] = useState("");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuper) return;
    let cancelled = false;

    api<{ entities: Entity[] }>("/entities")
      .then((data) => {
        if (!cancelled) setEntities(data.entities);
      })
      .catch(() => {
        /* entity filter is optional */
      });

    return () => {
      cancelled = true;
    };
  }, [isSuper]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ days: "30" });
        if (isSuper && filterEntityId) {
          params.set("entityId", filterEntityId);
        }
        const data = await api<{ overview: StatsOverview }>(
          `/stats/overview?${params.toString()}`,
        );
        if (!cancelled) setOverview(data.overview);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Laden mislukt");
          setOverview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSuper, filterEntityId]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overzicht</h1>
          <p>Welkom in de beheeromgeving van Booky CMS.</p>
        </div>
        {isSuper ? (
          <div className="page-header-actions">
            <label className="field" style={{ margin: 0, minWidth: 220 }}>
              <span>Entiteit</span>
              <select
                value={filterEntityId}
                onChange={(event) => setFilterEntityId(event.target.value)}
              >
                <option value="">Alle entiteiten</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
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

      {error ? <p className="error">{error}</p> : null}
      {loading && !overview ? (
        <p className="muted">Statistieken laden…</p>
      ) : null}

      {overview ? (
        <div className="stack" style={{ gap: "1.5rem" }}>
          <section className="stack">
            <div>
              <h2 style={{ fontSize: "1.15rem" }}>Gezondheid</h2>
              <p className="muted" style={{ marginTop: "0.25rem" }}>
                Laatste {overview.days} dagen
              </p>
            </div>
            <div className="stats-cards">
              <div className="stats-card">
                <span className="stats-card-label">404-fouten</span>
                <strong className="stats-card-value">
                  {overview.health.notFound404}
                </strong>
              </div>
              <div className="stats-card">
                <span className="stats-card-label">Formulierfouten</span>
                <strong className="stats-card-value">
                  {overview.health.formSubmitError}
                </strong>
              </div>
              <div className="stats-card">
                <span className="stats-card-label">E-mailfouten</span>
                <strong className="stats-card-value">
                  {overview.health.emailError}
                </strong>
              </div>
              <div className="stats-card stats-card-muted">
                <span className="stats-card-label">Make-fouten</span>
                <strong className="stats-card-value">
                  {overview.health.makeError}
                </strong>
                <span className="stats-card-note">Coming soon</span>
              </div>
            </div>
          </section>

          <section className="stack">
            <div>
              <h2 style={{ fontSize: "1.15rem" }}>Analytics</h2>
              <p className="muted" style={{ marginTop: "0.25rem" }}>
                Succesvolle boekingsinzendingen · laatste {overview.days} dagen
              </p>
            </div>

            <div className="panel">
              <div className="panel-body">
                <div className="stats-hero-metric">
                  <span className="stats-card-label">Succesvolle inzendingen</span>
                  <strong className="stats-card-value">
                    {overview.analytics.successfulSubmissions}
                  </strong>
                </div>
              </div>
            </div>

            <div className="stats-breakdown-grid">
              <BreakdownTable
                title="Per verkoper"
                rows={overview.analytics.bySeller}
                emptyLabel="Nog geen data"
              />
              <BreakdownTable
                title="Per locatie"
                rows={overview.analytics.byLocation}
                emptyLabel="Nog geen data"
              />
              <BreakdownTable
                title="Per categorie"
                rows={overview.analytics.byCategory}
                emptyLabel="Nog geen data"
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
