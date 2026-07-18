import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "FangaBase",
  description: "Lancez un produit solide, adapt? au cloud comme au serveur.",
  metadataBase: new URL("https://fangabase.example"),
  openGraph: {
    title: "FangaBase",
    description: "Une base applicative claire et s?curis?e.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
