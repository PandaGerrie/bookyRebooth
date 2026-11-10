import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Entity } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type SettingsTab = "content" | "domain" | "sellers";

type SellerConnection = {
  sellerId: string;
  name: string;
  email: string;
  imageUrl: string;
  visible: boolean;
  status: string;
  detail?: string;
  entity?: { id: string; name: string; slug: string } | null;
};

type AvailabilityRow = {
  sellerId: string;
  name: string;
  email: string;
  imageUrl: string;
  available: boolean;
  status: string;
  detail?: string;
};

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "content", label: "Algemene content" },
  { id: "domain", label: "Domeininstellingen" },
  { id: "sellers", label: "Verkopersconnecties" },
];

function todayIsoDate() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nextHalfHour() {
  const now = new Date();
  now.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function GeneralSettingsPage() {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState<SettingsTab>("content");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState(user?.entityId || "");
  const [connections, setConnections] = useState<SellerConnection[]>([]);
  const [configured, setConfigured] = useState(true);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testDate, setTestDate] = useState(todayIsoDate());
  const [testTime, setTestTime] = useState(nextHalfHour());
  const [testing, setTesting] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState<
    AvailabilityRow[] | null
  >(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    if (!isSuper) return;
    let cancelled = false;

    async function loadEntities() {
      try {
        const data = await api<{ entities: Entity[] }>("/entities");
        if (cancelled) return;
        setEntities(data.entities);
        if (!entityId && data.entities[0]) {
          setEntityId(data.entities[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Entiteiten laden mislukt");
        }
      }
    }

    void loadEntities();
    return () => {
      cancelled = true;
    };
  }, [isSuper, entityId]);

  useEffect(() => {
    if (activeTab !== "sellers") return;
    if (isSuper && !entityId) return;

    let cancelled = false;

    async function loadConnections() {
      setLoadingConnections(true);
      setError(null);
      setAvailabilityResults(null);
      try {
        const query =
          isSuper && entityId
            ? `?entityId=${encodeURIComponent(entityId)}`
            : "";
        const data = await api<{
          configured: boolean;
          message?: string;
          connections: SellerConnection[];
        }>(`/seller-connections${query}`);
        if (cancelled) return;
        setConfigured(data.configured);
        setConfigMessage(data.message ?? null);
        setConnections(data.connections);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Connecties laden mislukt",
          );
        }
      } finally {
        if (!cancelled) setLoadingConnections(false);
      }
    }

    void loadConnections();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isSuper, entityId]);

  async function runAvailabilityTest() {
    if (isSuper && !entityId) {
      setError("Kies een entiteit");
      return;
    }

    setTesting(true);
    setError(null);
    setAvailabilityResults(null);
    try {
      const data = await api<{
        results: AvailabilityRow[];
        availableCount: number;
        checked: number;
      }>("/seller-connections/availability-test", {
        method: "POST",
        body: JSON.stringify({
          date: testDate,
          time: testTime,
          durationMinutes: 30,
          ...(isSuper ? { entityId } : {}),
        }),
      });
      setAvailabilityResults(data.results);
      setAvailableCount(data.availableCount);
      setCheckedCount(data.checked);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Beschikbaarheidstest mislukt",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Algemene instellingen</h1>
          <p>Instellingen voor jouw entiteit.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Instellingen secties">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={activeTab === tab.id ? "tab active" : "tab"}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sellers" ? (
        <div className="stack">
          {isSuper ? (
            <label style={{ maxWidth: 320 }}>
              Entiteit
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">Kies entiteit…</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <p className="error">{error}</p> : null}

          {!configured && configMessage ? (
            <div className="panel">
              <div className="panel-body">
                <p className="muted">{configMessage}</p>
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel-body">
              <h2 style={{ marginBottom: "0.75rem" }}>Verkopersagenda’s</h2>
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Status op basis van het e-mailadres van de verkoper in Azure.
              </p>

              {loadingConnections ? (
                <div className="empty">Connecties controleren…</div>
              ) : connections.length === 0 ? (
                <div className="empty">Nog geen actieve verkopers.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Verkoper</th>
                      <th>E-mail</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((connection) => (
                      <tr key={connection.sellerId}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <img
                              src={connection.imageUrl}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid var(--line)",
                              }}
                            />
                            <span>{connection.name}</span>
                          </div>
                        </td>
                        <td>{connection.email}</td>
                        <td>
                          <span
                            className={
                              connection.visible
                                ? "badge badge-success"
                                : "badge badge-danger"
                            }
                            title={connection.detail || undefined}
                          >
                            {connection.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-body stack">
              <div>
                <h2 style={{ marginBottom: "0.35rem" }}>
                  Beschikbaarheidstest
                </h2>
                <p className="muted">
                  Kies een datum en uur om te zien wie op dat moment vrij is.
                </p>
              </div>

              <div className="form-grid two" style={{ maxWidth: 480 }}>
                <label>
                  Datum
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Uur
                  <input
                    type="time"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="actions" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="btn"
                  disabled={testing || loadingConnections || !configured}
                  onClick={() => void runAvailabilityTest()}
                >
                  {testing ? "Controleren…" : "Beschikbaarheid checken"}
                </button>
              </div>

              {availabilityResults ? (
                <div className="stack">
                  <p className="muted">
                    {availableCount} van {checkedCount} verkoper(s) beschikbaar
                    op {testDate} om {testTime}.
                  </p>
                  {availabilityResults.length === 0 ? (
                    <div className="empty">Nog geen actieve verkopers.</div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Verkoper</th>
                          <th>E-mail</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availabilityResults.map((row) => (
                          <tr key={row.sellerId}>
                            <td>{row.name}</td>
                            <td>{row.email}</td>
                            <td>
                              <span
                                className={
                                  row.available
                                    ? "badge badge-success"
                                    : "badge badge-danger"
                                }
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="empty">Meer instellingen volgen later.</div>
        </div>
      )}
    </div>
  );
}
