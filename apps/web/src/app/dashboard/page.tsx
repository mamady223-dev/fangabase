import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="dashboard">
      <header>
        <div>
          <p className="eyebrow">ESPACE DE D?MONSTRATION</p>
          <h1>Bonjour, Awa</h1>
        </div>
        <Link className="button small" href="/">
          Retour au site
        </Link>
        <Link className="button small" href="/billing">
          Facturation
        </Link>
      </header>
      <section className="metrics">
        <article>
          <p>Cr?dits disponibles</p>
          <strong>12 500</strong>
          <small>XOF de valeur d?usage</small>
        </article>
        <article>
          <p>Abonnement</p>
          <strong>Essentiel</strong>
          <small>Actif jusqu?au 31 ao?t</small>
        </article>
        <article>
          <p>Organisation</p>
          <strong>Fanga Studio</strong>
          <small>3 membres actifs</small>
        </article>
      </section>
      <section className="panel">
        <div>
          <p className="eyebrow">ACTIVIT?</p>
          <h2>Derni?res op?rations</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Op?ration</th>
              <th>Statut</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Achat de cr?dits</td>
              <td>
                <span className="success">R?ussi</span>
              </td>
              <td>10 000 XOF</td>
            </tr>
            <tr>
              <td>Abonnement Essentiel</td>
              <td>
                <span className="success">Actif</span>
              </td>
              <td>5 000 XOF</td>
            </tr>
            <tr>
              <td>Invitation membre</td>
              <td>En attente</td>
              <td>?</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
