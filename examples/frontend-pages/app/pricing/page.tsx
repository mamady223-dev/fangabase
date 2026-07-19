type Product = {
  id: string;
  name: string;
  description: string | null;
  purchase_mode: string;
  plans: Array<{
    id: string;
    name: string;
    included_credits: number;
    features: Record<string, number | boolean>;
    prices: Array<{
      id: string;
      amount_minor: number;
      currency: string;
      interval: string;
    }>;
  }>;
};
async function catalog(): Promise<Product[]> {
  const origin = process.env.FANGABASE_API_ORIGIN ?? "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${origin}/api/catalog`, {
      next: { revalidate: 60 },
    });
    return response.ok
      ? ((await response.json()) as { data: Product[] }).data
      : [];
  } catch {
    return [];
  }
}
export default async function ExamplePricingPage() {
  const products = await catalog();
  return (
    <main className="billing-page">
      <header>
        <p className="eyebrow">EXEMPLE FACULTATIF</p>
        <h1>Tarification</h1>
      </header>
      {products.length === 0 ? (
        <section role="status">
          <h2>Catalogue vide</h2>
        </section>
      ) : (
        <section className="pricing-grid">
          {products.map((product) => (
            <article key={product.id}>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              {product.plans.map((plan) => (
                <div key={plan.id}>
                  <h3>{plan.name}</h3>
                  {plan.prices.map((price) => (
                    <p key={price.id}>
                      {price.amount_minor.toLocaleString("fr-FR")}{" "}
                      {price.currency} · {price.interval}
                    </p>
                  ))}
                  <p>{plan.included_credits} crédits inclus</p>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
