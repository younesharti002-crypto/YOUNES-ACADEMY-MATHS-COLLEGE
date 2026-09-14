import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function one(client, sql, params = []) {
  const result = await client.query(sql, params);
  if (!result.rows[0]) throw new Error("Seed query returned no row");
  return result.rows[0];
}

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const year = await one(
    client,
    `INSERT INTO academic_years (name, starts_at, ends_at, active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (name) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, active = true, updated_at = now()
     RETURNING id, name`,
    ["2026/2027", "2026-09-01T00:00:00+01:00", "2027-08-31T23:59:59+01:00"],
  );

  const levels = [];
  for (const levelName of ["1AC", "2AC", "3AC"]) {
    const level = await one(
      client,
      `INSERT INTO levels (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET updated_at = now()
       RETURNING id, name`,
      [levelName],
    );
    levels.push(level);
  }

  await one(
    client,
    `INSERT INTO subjects (name, slug, active) VALUES ($1, $2, true)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, active = true, updated_at = now()
     RETURNING id, name`,
    ["Mathématiques", "mathematiques"],
  );

  await one(
    client,
    `INSERT INTO offers (name, slug, description, academic_year_id, starts_at, ends_at, active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       academic_year_id = EXCLUDED.academic_year_id,
       starts_at = EXCLUDED.starts_at,
       ends_at = EXCLUDED.ends_at,
       active = true,
       updated_at = now()
     RETURNING id, name`,
    [
      "Maths Collège 2026/2027",
      "maths-college-2026-2027",
      "Accès aux cours, exercices, lives et replays de Younes Academy.",
      year.id,
      "2026-09-01T00:00:00+01:00",
      "2027-08-31T23:59:59+01:00",
    ],
  );

  for (const level of levels) {
    const stream = await one(
      client,
      `INSERT INTO streams (name, level_id) VALUES ($1, $2)
       ON CONFLICT (level_id, name) DO UPDATE SET updated_at = now()
       RETURNING id, name`,
      ["Collège", level.id],
    );
    const groupName = `${level.name}-MATHS-A`;
    await one(
      client,
      `INSERT INTO groups (name, academic_year_id, level_id, stream_id, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (academic_year_id, level_id, stream_id, name)
       DO UPDATE SET active = true, updated_at = now()
       RETURNING id, name`,
      [groupName, year.id, level.id, stream.id],
    );
  }

  await client.query("COMMIT");
  console.log("Academic seed completed: 2026/2027 · 1AC/2AC/3AC · Mathématiques · offer · groups A");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
