import { pool } from "@/db";

let ensured = false;

export async function ensureLeadsSchema() {
  if (ensured) return;

  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'REGISTERED', 'ARCHIVED');
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name text NOT NULL,
      phone varchar(32) NOT NULL,
      level varchar(80) NOT NULL,
      subject varchar(120) NOT NULL,
      source varchar(80) NOT NULL DEFAULT 'landing_page',
      message text,
      status lead_status NOT NULL DEFAULT 'NEW',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS registration_leads_phone_idx ON registration_leads (phone);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS registration_leads_status_idx ON registration_leads (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS registration_leads_created_at_idx ON registration_leads (created_at);`);

  ensured = true;
}
