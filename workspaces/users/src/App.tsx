import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAppAdmin } from "@pps/login/AppAdminContext";
import {
  addAppAdmin,
  listAppAdmins,
  removeAppAdmin,
  type AppAdminRow,
} from "@pps/login/appAdminApi";
import { createBrowserClient } from "@pps/login/client";
import { isMissingConfig, readSupabaseConfig } from "@pps/login/config";
import { viewerLandingHref } from "@pps/login/navAccess";
import { readBrowserSiteRoot } from "@pps/login/siteRoot";

export function App() {
  const { isAdmin } = useAppAdmin();
  const [rows, setRows] = useState<AppAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const client = useMemo(() => {
    const config = readSupabaseConfig();
    if (isMissingConfig(config)) {
      return null;
    }
    return createBrowserClient(config);
  }, []);

  const reload = useCallback(async () => {
    if (!client) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRows(await listAppAdmins(client));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!isAdmin) {
      window.location.replace(viewerLandingHref(readBrowserSiteRoot()));
      return;
    }
    void reload();
  }, [isAdmin, reload]);

  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!client) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      setError("Ingresá un correo válido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addAppAdmin(client, trimmedEmail, displayName);
      setEmail("");
      setDisplayName("");
      await reload();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(rowEmail: string): Promise<void> {
    if (!client) {
      return;
    }

    setError(null);
    try {
      await removeAppAdmin(client, rowEmail);
      await reload();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : String(removeError);
      setError(message);
    }
  }

  return (
    <div className="dashboard__content users">
      <div className="users__workspace">
        <header className="users__header">
          <div className="dashboard__header-top">
            <div className="dashboard__header-title-row">
              <h1 className="users__header-title dashboard__header-title">Administradores</h1>
            </div>
            <div className="dashboard__header-lead-row">
              <p className="dashboard__header-lead">
                Gestioná quién puede editar páginas, recursos, roadmap y analytics. Solo correos listados
                tienen rol de administrador.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <p className="users__error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="users__panel">
          <h2 className="users__section-title">Agregar administrador</h2>
          <form className="users__form" onSubmit={(event) => void handleAdd(event)}>
            <label className="users__field">
              <span className="users__label">Nombre visible</span>
              <input
                className="users__input"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                placeholder="Nombre en la barra lateral"
              />
            </label>
            <label className="users__field">
              <span className="users__label">Correo</span>
              <input
                className="users__input"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="persona@ejemplo.com"
              />
            </label>
            <button className="users__button" type="submit" disabled={submitting}>
              Agregar
            </button>
          </form>
        </section>

        <section className="users__panel">
          <h2 className="users__section-title">Administradores actuales</h2>
          {loading ? <p className="users__muted">Cargando…</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="users__muted">Todavía no hay administradores.</p>
          ) : null}
          {!loading && rows.length > 0 ? (
            <div className="users__table-wrap">
              <table className="users__table">
                <thead>
                  <tr className="users__row">
                    <th className="users__cell users__cell--head" scope="col">
                      Persona
                    </th>
                    <th className="users__cell users__cell--head users__cell--actions" scope="col">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.email} className="users__row">
                      <td className="users__cell">
                        <span className="users__row-name">{row.display_name?.trim() || row.email}</span>
                        <span className="users__row-email">{row.email}</span>
                      </td>
                      <td className="users__cell users__cell--actions">
                        <button
                          type="button"
                          className="users__row-remove"
                          aria-label={`Quitar administrador ${row.email}`}
                          onClick={() => void handleRemove(row.email)}
                        >
                          <span className="users__row-remove-icon" aria-hidden="true">
                            ×
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
