import { Link } from "@inertiajs/react";
import type { PropsWithChildren } from "react";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <>
      <nav aria-label="Navigation principale">
        <Link href="/dashboard">Tableau de bord</Link>
      </nav>
      <main>{children}</main>
    </>
  );
}
