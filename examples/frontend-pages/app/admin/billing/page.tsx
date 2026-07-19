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
export default function ExampleBillingAdminPage() {
  const [message, setMessage] = useState("");
  const submit = async (
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
  ) => {
    event.preventDefault();
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
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });
    setMessage(response.ok ? "Opération enregistrée." : "Opération refusée.");
  };
  return (
    <main>
      <p>Exemple administratif facultatif et remplaçable.</p>
      {message && <p role="status">{message}</p>}
      <form
        onSubmit={(event) => void submit(event, "/api/backend/admin/catalog")}
      >
        <h1>Créer un produit et un plan</h1>
        <label>
          Slug
          <input name="slug" required />
        </label>
        <label>
          Nom
          <input name="name" required />
        </label>
        <input name="description" />
        <select name="purchase_mode">
          <option>HYBRID</option>
        </select>
        <input name="plan_slug" required />
        <input name="plan_name" required />
        <input name="amount_minor" type="number" min="1" required />
        <input name="currency" defaultValue="XOF" required />
        <select name="interval">
          <option>MONTH</option>
          <option>YEAR</option>
          <option>ONE_TIME</option>
        </select>
        <input name="included_credits" type="number" min="0" defaultValue="0" />
        <textarea name="features" defaultValue="{}" />
        <input name="terms_version" type="hidden" value="1" />
        <button type="submit">Créer</button>
      </form>
      <form
        onSubmit={(event) =>
          void submit(event, "/api/backend/admin/credits/grant")
        }
      >
        <h2>Attribuer des crédits</h2>
        <select name="owner_type">
          <option>USER</option>
          <option>ORGANIZATION</option>
        </select>
        <input name="owner_id" required />
        <input name="quantity" type="number" min="1" required />
        <textarea name="reason" required />
        <button type="submit">Attribuer</button>
      </form>
    </main>
  );
}
