export type SharedProps = {
  auth: { user: { id: string; name: string; email: string } | null };
  flash: { status?: string };
};
