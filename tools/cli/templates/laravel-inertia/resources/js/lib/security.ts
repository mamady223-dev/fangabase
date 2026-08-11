const forbiddenPublicName =
  /(secret|password|private.?key|token|client.?secret)/i;

export function assertSafeViteEnvironment(
  environment: Record<string, unknown>,
) {
  for (const name of Object.keys(environment)) {
    if (name.startsWith("VITE_") && forbiddenPublicName.test(name)) {
      throw new Error(
        `Variable Vite potentiellement secrète interdite: ${name}`,
      );
    }
  }
}
