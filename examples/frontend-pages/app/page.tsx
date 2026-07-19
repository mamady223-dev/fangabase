import Link from "next/link";

const strengths = [
  [
    "Quatre chemins",
    "Vercel, VPS, hébergement mutualisé ou architecture hybride.",
  ],
  [
    "Paiements adaptables",
    "Crédits, abonnements et fournisseurs sélectionnés par configuration.",
  ],
  [
    "Sécurité visible",
    "Contrats stables, journaux d’audit et contrôles testés dès la base.",
  ],
];

export default function ExampleLandingPage() {
  return (
    <main>
      <nav aria-label="Navigation de démonstration">
        <Link className="brand" href="/">
          FangaBase
        </Link>
        <div>
          <a href="#architecture">Architecture</a>
          <a href="#tarifs">Tarifs</a>
          <Link className="button small" href="/dashboard">
            Démonstration
          </Link>
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">EXEMPLE FACULTATIF</p>
        <h1>
          Construisez votre produit.
          <br />
          <span>Gardez le contrôle.</span>
        </h1>
        <p>
          Exemple de landing page remplaçable pour illustrer les branchements du
          socle.
        </p>
        <div className="actions">
          <Link className="button" href="/dashboard">
            Explorer la démo
          </Link>
          <a className="link" href="#architecture">
            Comparer les profils
          </a>
        </div>
      </section>
      <section id="architecture" className="grid">
        {strengths.map(([title, text], index) => (
          <article key={title}>
            <span>0{index + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section id="tarifs" className="statement">
        <p>Contenu de démonstration.</p>
        <h2>À remplacer par l’identité du projet étudiant.</h2>
      </section>
    </main>
  );
}
