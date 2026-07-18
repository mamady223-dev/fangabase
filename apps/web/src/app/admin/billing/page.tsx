"use client";

import { FormEvent, useState } from "react";

function csrf(): string {
  return (
    document.cookie
      .split("; ")
      .find((value) => value.startsWith("fangabase_csrf="))
      ?.split("=")[1] ?? ""
  );
}
function idempotency(): string {
  return crypto.randomUUID();
}

export default function BillingAdminPage() {
  const [message, setMessage] = useState("");
  const submit = async (
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
  ) => {
    event.preventDefault();
    setMessage("Enregistrement en cours…");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    for (const key of [
      "amount_minor",
      "included_credits",
      "terms_version",
      "quantity",
    ])
      if (key in payload) payload[key] = Number(payload[key]);
    if ("features" in payload)
      payload.features = JSON.parse(String(payload.features));
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "X-CSRF-TOKEN": decodeURIComponent(csrf()),
        "Idempotency-Key": idempotency(),
      },
      body: JSON.stringify(payload),
    });
    setMessage(
      response.ok
        ? "Opération enregistrée avec succès."
        : "Opération refusée. Vérifiez vos droits et les champs.",
    );
  };
  return (
    <main className="billing-page">
      <header className="billing-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION FINANCIÈRE</p>
          <h1>Piloter le catalogue et les droits</h1>
          <p>
            Chaque mutation est protégée par CSRF, permissions, idempotence et
            audit côté serveur.
          </p>
        </div>
      </header>
      {message && (
        <p className="state-card compact" role="status" aria-live="polite">
          {message}
        </p>
      )}
      <section className="admin-grid">
        <form
          className="panel admin-form"
          onSubmit={(event) => void submit(event, "/api/backend/admin/catalog")}
        >
          <h2>Nouveau produit et plan</h2>
          <label>
            Identifiant produit
            <input name="slug" required pattern="[A-Za-z0-9_-]+" />
          </label>
          <label>
            Nom produit
            <input name="name" required />
          </label>
          <label>
            Description
            <textarea name="description" />
          </label>
          <label>
            Mode
            <select name="purchase_mode">
              <option>CREDITS</option>
              <option>SUBSCRIPTION</option>
              <option>ONE_TIME</option>
              <option>HYBRID</option>
            </select>
          </label>
          <label>
            Identifiant plan
            <input name="plan_slug" required />
          </label>
          <label>
            Nom plan
            <input name="plan_name" required />
          </label>
          <label>
            Montant en unité mineure
            <input
              name="amount_minor"
              type="number"
              min="1"
              step="1"
              required
            />
          </label>
          <label>
            Devise
            <input
              name="currency"
              defaultValue="XOF"
              pattern="[A-Z]{3}"
              required
            />
          </label>
          <label>
            Périodicité
            <select name="interval">
              <option>ONE_TIME</option>
              <option>MONTH</option>
              <option>YEAR</option>
            </select>
          </label>
          <label>
            Crédits inclus
            <input
              name="included_credits"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
            />
          </label>
          <label>
            Fonctionnalités JSON
            <textarea name="features" defaultValue="{}" required />
          </label>
          <input name="terms_version" type="hidden" value="1" />
          <button className="button" type="submit">
            Créer le catalogue
          </button>
        </form>
        <form
          className="panel admin-form"
          onSubmit={(event) =>
            void submit(event, "/api/backend/admin/credits/grant")
          }
        >
          <h2>Attribuer des crédits</h2>
          <label>
            Type de propriétaire
            <select name="owner_type">
              <option>USER</option>
              <option>ORGANIZATION</option>
            </select>
          </label>
          <label>
            Identifiant propriétaire
            <input name="owner_id" required />
          </label>
          <label>
            Quantité
            <input name="quantity" type="number" min="1" step="1" required />
          </label>
          <label>
            Expiration facultative
            <input name="expires_at" type="datetime-local" />
          </label>
          <label>
            Motif d’audit
            <textarea name="reason" minLength={3} maxLength={500} required />
          </label>
          <button className="button" type="submit">
            Attribuer
          </button>
        </form>
        <article className="panel">
          <h2>Opérations</h2>
          <p>
            Les prix archivés, écritures et transitions restent conservés. La
            consultation détaillée est disponible par l’API financière paginée.
          </p>
          <a className="button small" href="/pricing">
            Catalogue public
          </a>
        </article>
      </section>
    </main>
  );
}
