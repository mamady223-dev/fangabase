import Link from "next/link";

const strengths = [
  [
    "Quatre chemins",
    "Vercel, VPS, h?bergement mutualis? ou architecture hybride.",
  ],
  [
    "Paiements adaptables",
    "Cr?dits, abonnements et fournisseurs s?lectionn?s par configuration.",
  ],
  [
    "S?curit? visible",
    "Contrats stables, journaux d?audit et contr?les test?s d?s la base.",
  ],
];

export default function HomePage() {
  return (
    <main>
      <nav aria-label="Navigation principale">
        <Link className="brand" href="/">
          FangaBase
        </Link>
        <div>
          <a href="#architecture">Architecture</a>
          <a href="#tarifs">Tarifs</a>
          <Link className="button small" href="/dashboard">
            D?monstration
          </Link>
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">BASE APPLICATIVE FRANCOPHONE</p>
        <h1>
          Construisez votre produit.
          <br />
          <span>Gardez le contr?le.</span>
        </h1>
        <p>
          Un socle original pour lancer un SaaS, une marketplace ou un service
          sans reconstruire l?authentification, la facturation et les
          op?rations.
        </p>
        <div className="actions">
          <Link className="button" href="/dashboard">
            Explorer la d?mo
          </Link>
          <a className="link" href="#architecture">
            Comparer les profils ?
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
        <p>Commencez avec les valeurs s?res.</p>
        <h2>
          Fran?ais. XOF. Mali.
          <br />
          Pr?t pour votre march?.
        </h2>
      </section>
    </main>
  );
}
