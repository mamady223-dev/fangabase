export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert">{message}</p> : null;
}
