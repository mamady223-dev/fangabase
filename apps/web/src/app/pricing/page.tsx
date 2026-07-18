type Price = {
  id: string;
  amount_minor: number;
  currency: string;
  interval: string;
};
type Plan = {
  id: string;
  name: string;
  interval: string;
  included_credits: number;
  features: Record<string, number | boolean>;
  prices: Price[];
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  purchase_mode: string;
  plans: Plan[];
};

async function catalog(): Promise<Product[]> {
  const origin = process.env.FANGABASE_API_ORIGIN ?? "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${origin}/api/catalog`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    return ((await response.json()) as { data: Product[] }).data;
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const products = await catalog();
  return (
    <main className="billing-page">
      <header className="billing-heading">
        <div>
          <p className="eyebrow">TARIFICATION TRANSPARENTE</p>
          <h1>Choisissez votre façon d’avancer</h1>
          <p>
            Crédits à l’usage, abonnement ou achat unique : le catalogue affiché
            vient directement du serveur FangaBase.
          </p>
        </div>
        <a className="button small" href="/billing">
          Mon espace
        </a>
      </header>
      {products.length === 0 ? (
        <section className="state-card" role="status">
          <h2>Catalogue bientôt disponible</h2>
          <p>Aucun produit actif n’est publié pour le moment.</p>
        </section>
      ) : (
        <section className="pricing-grid" aria-label="Plans disponibles">
          {products.map((product) => (
            <article className="price-card" key={product.id}>
              <span className="mode">
                {product.purchase_mode.replaceAll("_", " ")}
              </span>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              {product.plans.map((plan) => (
                <div key={plan.id}>
                  <h3>{plan.name}</h3>
                  {plan.prices.map((price) => (
                    <p className="price" key={price.id}>
                      {price.amount_minor.toLocaleString("fr-FR")}{" "}
                      <small>
                        {price.currency} · {price.interval.toLowerCase()}
                      </small>
                    </p>
                  ))}
                  <p>
                    {plan.included_credits.toLocaleString("fr-FR")} crédits
                    inclus
                  </p>
                  <ul>
                    {Object.entries(plan.features).map(([feature, limit]) => (
                      <li key={feature}>
                        {feature} : {String(limit)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
