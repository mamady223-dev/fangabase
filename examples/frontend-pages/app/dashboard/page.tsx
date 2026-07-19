import Link from "next/link";

export default function ExampleDashboardPage() {
  return (
    <main className="dashboard">
      <header>
        <div>
          <p className="eyebrow">EXEMPLE FACULTATIF</p>
          <h1>Bonjour, Awa</h1>
        </div>
        <Link className="button small" href="/">
          Retour
        </Link>
        <Link className="button small" href="/billing">
          Facturation
        </Link>
      </header>
      <section className="metrics">
        <article>
          <p>Crédits disponibles</p>
          <strong>12 500</strong>
          <small>valeur de démonstration</small>
        </article>
        <article>
          <p>Abonnement</p>
          <strong>Essentiel</strong>
          <small>Actif jusqu’au 31 août</small>
        </article>
        <article>
          <p>Organisation</p>
          <strong>Fanga Studio</strong>
          <small>3 membres actifs</small>
        </article>
      </section>
      <section className="panel">
        <h2>Dernières opérations</h2>
        <table>
          <thead>
            <tr>
              <th>Opération</th>
              <th>Statut</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Achat de crédits</td>
              <td>Réussi</td>
              <td>10 000 XOF</td>
            </tr>
            <tr>
              <td>Abonnement</td>
              <td>Actif</td>
              <td>5 000 XOF</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
