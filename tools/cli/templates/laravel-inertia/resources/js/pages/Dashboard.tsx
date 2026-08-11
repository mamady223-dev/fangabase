import { Head, useForm } from "@inertiajs/react";
import { FormError } from "../components/FormError";
import { AppLayout } from "../layouts/AppLayout";
import type { SharedProps } from "../types/inertia";

export default function Dashboard({ auth }: SharedProps) {
  const form = useForm({ name: auth.user?.name ?? "" });
  return (
    <AppLayout>
      <Head title="Application technique" />
      <h1>Application technique</h1>
      <p>Laravel et React/Inertia fonctionnent sur la même origine.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.patch("/profile", { preserveScroll: true });
        }}
      >
        <label htmlFor="name">Nom</label>
        <input
          id="name"
          value={form.data.name}
          onChange={(event) => form.setData("name", event.target.value)}
        />
        <FormError message={form.errors.name} />
        <button type="submit" disabled={form.processing}>
          Enregistrer
        </button>
      </form>
    </AppLayout>
  );
}
