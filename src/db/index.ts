import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { normalizePostgresConnectionString } from "@/lib/db/connection-string";

const globalForDb = globalThis as typeof globalThis & {
  __younesAcademyPool?: Pool;
};

export const pool =
  globalForDb.__younesAcademyPool ??
  new Pool({
    connectionString: normalizePostgresConnectionString(process.env.DATABASE_URL),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__younesAcademyPool = pool;
}

export const db = drizzle(pool, { schema });
