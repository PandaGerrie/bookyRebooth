import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Entity, Role, User } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type FormState = {
  email: string;
  password: string;
  role: Role;
  entityId: string;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  role: "ENTITY_ADMIN",
  entityId: "",
};

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ENTITY_ADMIN: "Entiteit admin",
};

export function UsersPage() {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const usersData = await api<{ users: User[] }>("/users");
      setUsers(usersData.users);

      if (isSuper) {
        const entitiesData = await api<{ entities: Entity[] }>("/entities");
        setEntities(entitiesData.entities);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [isSuper]);

  function openCreateForm() {
    setForm({
      ...emptyForm,
      entityId: isSuper ? "" : user?.entityId || "",
      role: "ENTITY_ADMIN",
    });
    setShowForm(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = isSuper
        ? {
            email: form.email,
            password: form.password,
            role: form.role,
            entityId: form.role === "ENTITY_ADMIN" ? form.entityId : null,
          }
        : {
            email: form.email,
            password: form.password,
          };

      await api("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gebruikers</h1>
          <p>
            {isSuper
              ? "Beheer alle accounts: super admins of toewijzen aan een entiteit."
              : "Voeg collega’s toe binnen jouw entiteit."}
          </p>
        </div>
        <button type="button" className="btn" onClick={openCreateForm}>
          Nieuwe gebruiker
        </button>
      </div>

      {error ? (
        <p className="error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="panel">
        {loading ? (
          <div className="empty">Laden…</div>
        ) : users.length === 0 ? (
          <div className="empty">Nog geen gebruikers.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Rol</th>
                {isSuper ? <th>Entiteit</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.email}</td>
                  <td>
                    <span className="badge">{roleLabel[item.role]}</span>
                  </td>
                  {isSuper ? <td>{item.entity?.name ?? "—"}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showForm ? (
          <form className="drawer stack" onSubmit={onSubmit}>
            <h2>Nieuwe gebruiker</h2>
            {!isSuper && user?.entity?.name ? (
              <p className="muted" style={{ margin: 0 }}>
                Wordt toegevoegd aan <strong>{user.entity.name}</strong> als
                entiteit admin.
              </p>
            ) : null}
            <div className="form-grid two">
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Wachtwoord
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  minLength={8}
                  required
                />
              </label>
              {isSuper ? (
                <>
                  <label>
                    Rol
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          role: e.target.value as Role,
                        }))
                      }
                    >
                      <option value="ENTITY_ADMIN">Entiteit admin</option>
                      <option value="SUPER_ADMIN">Super admin</option>
                    </select>
                  </label>
                  {form.role === "ENTITY_ADMIN" ? (
                    <label>
                      Entiteit
                      <select
                        value={form.entityId}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            entityId: e.target.value,
                          }))
                        }
                        required
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
                </>
              ) : null}
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Annuleren
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
