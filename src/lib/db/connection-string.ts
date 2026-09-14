const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresConnectionString(value: string | undefined): string | undefined {
  if (!value) return value;

  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return value;
  }
}
