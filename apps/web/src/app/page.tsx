type Health = { status: "ok" | "unavailable"; checked: boolean };

async function backendHealth(): Promise<Health> {
  const origin = process.env.FANGABASE_API_ORIGIN;
  if (!origin) return { status: "unavailable", checked: false };
  try {
    const response = await fetch(`${origin}/api/health`, { cache: "no-store" });
    return { status: response.ok ? "ok" : "unavailable", checked: true };
  } catch {
    return { status: "unavailable", checked: true };
  }
}

export default async function TechnicalStatusPage() {
  const health = await backendHealth();
  const profile = process.env.FANGABASE_PROFILE ?? "non configuré";
  return (
    <main>
      <h1>FangaBase</h1>
      <p>
        Socle headless opérationnel. Cette page est uniquement un contrôle
        technique et ne définit aucun design.
      </p>
      <section aria-labelledby="status-title">
        <h2 id="status-title">État</h2>
        <dl>
          <div>
            <dt>Application web</dt>
            <dd>opérationnelle</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>{health.checked ? health.status : "origine non configurée"}</dd>
          </div>
          <div>
            <dt>Profil</dt>
            <dd>{profile}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="next-title">
        <h2 id="next-title">Prochaines étapes</h2>
        <ol>
          <li>Copier le fichier de configuration d’exemple.</li>
          <li>Choisir un profil d’architecture.</li>
          <li>Brancher les services nécessaires.</li>
          <li>Intégrer un design uniquement si le projet le demande.</li>
        </ol>
      </section>
      <p>
        <a href="/api/health">Santé du frontend (JSON)</a>
      </p>
    </main>
  );
}
