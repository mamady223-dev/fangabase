import { usePage } from "@inertiajs/react";

export function useFormErrors(): Record<string, string> {
  return usePage().props.errors as Record<string, string>;
}
