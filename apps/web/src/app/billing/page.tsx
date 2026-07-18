"use client";
import { useEffect, useState } from "react";

type Summary = {
  credits: {
    balance: number;
    unit: string;
    history: {
      data: Array<{
        id: string;
        kind: string;
        quantity_fixed: number;
        occurred_at: string;
      }>;
    };
  };
  subscription: null | { status: string; current_period_end: string | null };
  entitlements: {
    features: Record<
      string,
      {
        limit: number | null;
        used: number;
        valid_until: string | null;
        source: string;
      }
    >;
  };
};

export default function BillingPage() {
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    data: Summary | null;
  }>({ loading: true, error: false, data: null });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/backend/billing/summary", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        setState({
          loading: false,
          error: false,
          data: (await response.json()) as Summary,
        });
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setState({ loading: false, error: true, data: null });
      });
    return () => controller.abort();
  }, []);
  return (
    <main className="billing-page">
      <header className="billing-heading">
        <div>
          <p className="eyebrow">FACTURATION</p>
          <h1>Votre usage, sans surprise</h1>
        </div>
        <a className="button small" href="/pricing">
          Voir les offres
        </a>
      </header>
      {state.loading && (
        <section className="state-card" role="status" aria-live="polite">
          Chargement de votre facturation…
        </section>
      )}
      {state.error && (
        <section className="state-card error-state" role="alert">
          <h2>Facturation indisponible</h2>
          <p>Réessayez dans un instant. Aucun débit n’a été effectué.</p>
        </section>
      )}
      {state.data && (
        <>
          <section className="metrics">
            <article>
              <p>Crédits disponibles</p>
              <strong>
                {state.data.credits.balance.toLocaleString("fr-FR")}
              </strong>
              <small>{state.data.credits.unit}</small>
            </article>
            <article>
              <p>Abonnement</p>
              <strong>{state.data.subscription?.status ?? "Aucun"}</strong>
              <small>
                {state.data.subscription?.current_period_end
                  ? `Prochaine échéance : ${new Date(state.data.subscription.current_period_end).toLocaleDateString("fr-FR")}`
                  : "Sans engagement actif"}
              </small>
            </article>
            <article>
              <p>Droits actifs</p>
              <strong>
                {Object.keys(state.data.entitlements.features).length}
              </strong>
              <small>fonctionnalités accessibles</small>
            </article>
          </section>
          <section className="panel">
            <h2>Droits d’utilisation</h2>
            {Object.keys(state.data.entitlements.features).length === 0 ? (
              <p>Aucun droit actif.</p>
            ) : (
              <ul className="entitlement-list">
                {Object.entries(state.data.entitlements.features).map(
                  ([name, item]) => (
                    <li key={name}>
                      <strong>{name}</strong>
                      <span>
                        {item.used}
                        {item.limit === null ? "" : ` / ${item.limit}`} ·{" "}
                        {item.source}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
          <section className="panel table-wrap">
            <h2>Historique des crédits</h2>
            {state.data.credits.history.data.length === 0 ? (
              <p>Aucune transaction enregistrée.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Opération</th>
                    <th>Crédits</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.credits.history.data.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.kind}</td>
                      <td>{entry.quantity_fixed.toLocaleString("fr-FR")}</td>
                      <td>
                        {new Date(entry.occurred_at).toLocaleDateString(
                          "fr-FR",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
