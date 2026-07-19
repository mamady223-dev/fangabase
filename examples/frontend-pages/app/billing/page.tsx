"use client";
import { useEffect, useState } from "react";
type Summary = {
  credits: {
    balance: number;
    unit: string;
    history: {
      data: Array<{ id: string; kind: string; quantity_fixed: number }>;
    };
  };
  subscription: null | { status: string; current_period_end: string | null };
  entitlements: {
    features: Record<
      string,
      { limit: number | null; used: number; source: string }
    >;
  };
};
export default function ExampleBillingPage() {
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    data: Summary | null;
  }>({ loading: true, error: false, data: null });
  useEffect(() => {
    fetch("/api/backend/billing/summary", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setState({
          loading: false,
          error: false,
          data: (await response.json()) as Summary,
        });
      })
      .catch(() => setState({ loading: false, error: true, data: null }));
  }, []);
  return (
    <main className="billing-page">
      <p className="eyebrow">EXEMPLE FACULTATIF</p>
      <h1>Facturation</h1>
      {state.loading && <p role="status">Chargement…</p>}
      {state.error && <p role="alert">Facturation indisponible.</p>}
      {state.data && (
        <>
          <section>
            <h2>Crédits</h2>
            <p>
              {state.data.credits.balance} {state.data.credits.unit}
            </p>
          </section>
          <section>
            <h2>Abonnement</h2>
            <p>{state.data.subscription?.status ?? "Aucun"}</p>
          </section>
          <section>
            <h2>Droits actifs</h2>
            <ul>
              {Object.entries(state.data.entitlements.features).map(
                ([name, value]) => (
                  <li key={name}>
                    {name}: {value.used}
                    {value.limit === null ? "" : ` / ${value.limit}`} ·{" "}
                    {value.source}
                  </li>
                ),
              )}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
