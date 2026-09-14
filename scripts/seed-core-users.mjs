import "dotenv/config";
import pg from "pg";
import { hashPassword } from "../src/lib/auth/password.ts";
import { normalizeMoroccanPhone } from "../src/lib/auth/phone.ts";

const { Pool } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizedPhone(name) {
  const phone = normalizeMoroccanPhone(required(name));
  if (!phone) throw new Error(`Invalid Moroccan phone in ${name}`);
  return phone;
}

const databaseUrl = required("DATABASE_URL");
const seeds = [
  {
    fullName: required("SEED_ADMIN_NAME"),
    phone: normalizedPhone("SEED_ADMIN_PHONE"),
    password: required("SEED_ADMIN_PASSWORD"),
    role: "ADMIN",
    preferredLanguage: process.env.SEED_ADMIN_LANGUAGE === "fr" ? "fr" : "ar",
  },
  {
    fullName: required("SEED_TEACHER_NAME"),
    phone: normalizedPhone("SEED_TEACHER_PHONE"),
    password: required("SEED_TEACHER_PASSWORD"),
    role: "TEACHER",
    preferredLanguage: process.env.SEED_TEACHER_LANGUAGE === "fr" ? "fr" : "ar",
  },
];

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  for (const seed of seeds) {
    const passwordHash = await hashPassword(seed.password);
    const result = await pool.query(
      `insert into users (full_name, phone, password_hash, role, status, preferred_language)
       values ($1, $2, $3, $4, 'ACTIVE', $5)
       on conflict (phone) do nothing
       returning id, full_name, phone, role, status, preferred_language`,
      [seed.fullName, seed.phone, passwordHash, seed.role, seed.preferredLanguage],
    );

    if (result.rowCount === 1) {
      console.log(`Created ${seed.role} seed account for ${seed.fullName}.`);
    } else {
      console.log(`Skipped ${seed.role} seed account because the phone already exists.`);
    }
  }
} finally {
  await pool.end();
}
