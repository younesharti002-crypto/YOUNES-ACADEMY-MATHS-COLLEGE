import "dotenv/config";
import pg from "pg";
import { hashPassword } from "../src/lib/auth/password.ts";
import { normalizeMoroccanPhone } from "../src/lib/auth/phone.ts";

const { Pool } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const databaseUrl = required("DATABASE_URL");
const fullName = required("SEED_ADMIN_NAME");
const phone = normalizeMoroccanPhone(required("SEED_ADMIN_PHONE"));
const password = required("SEED_ADMIN_PASSWORD");
const preferredLanguage =
  process.env.SEED_ADMIN_LANGUAGE === "fr" ? "fr" : "ar";

if (!phone) {
  throw new Error("Invalid Moroccan phone in SEED_ADMIN_PHONE");
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  const existing = await pool.query(
    "select id from users where role = 'ADMIN' limit 2",
  );

  if (existing.rowCount > 1) {
    throw new Error(
      "Admin reset aborted because more than one ADMIN account exists.",
    );
  }

  const passwordHash = await hashPassword(password);

  if (existing.rowCount === 1) {
    await pool.query(
      `update users
       set full_name = $1,
           phone = $2,
           password_hash = $3,
           role = 'ADMIN',
           status = 'ACTIVE',
           preferred_language = $4,
           updated_at = now()
       where id = $5`,
      [fullName, phone, passwordHash, preferredLanguage, existing.rows[0].id],
    );

    console.log("Reset the existing ADMIN account from Vercel seed values.");
  } else {
    await pool.query(
      `insert into users
         (full_name, phone, password_hash, role, status, preferred_language)
       values ($1, $2, $3, 'ADMIN', 'ACTIVE', $4)`,
      [fullName, phone, passwordHash, preferredLanguage],
    );

    console.log("Created the ADMIN account from Vercel seed values.");
  }
} finally {
  await pool.end();
}
