import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "FangaBase",
  description: "Socle applicatif headless et configurable.",
  metadataBase: new URL("https://fangabase.example"),
  openGraph: {
    title: "FangaBase",
    description: "Socle applicatif headless et configurable.",
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
