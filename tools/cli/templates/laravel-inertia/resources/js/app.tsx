import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob("./pages/**/*.tsx");
    const page = pages[`./pages/${name}.tsx`];
    if (!page) throw new Error(`Page Inertia inconnue: ${name}`);
    return page();
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: { color: "currentColor", showSpinner: false },
});
