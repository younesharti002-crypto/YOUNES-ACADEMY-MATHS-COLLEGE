/**
 * Central environment access for the app.
 * PHASE 0 keeps this intentionally small: one required database URL and one
 * optional public site URL.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  get siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
