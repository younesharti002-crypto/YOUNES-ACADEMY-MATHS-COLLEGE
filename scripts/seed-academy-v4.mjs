import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const levels = ["4AP", "5AP", "6AP", "1AC", "2AC", "3AC", "TC", "1BAC", "2BAC"];

const subjects = [
  ["Mathématiques", "mathematiques"],
  ["Français", "francais"],
  ["Arabe", "arabe"],
  ["Physique-Chimie", "physique-chimie"],
  ["SVT", "svt"],
  ["Anglais", "anglais"],
  ["Histoire-Géographie", "histoire-geographie"],
  ["Comptabilité", "comptabilite"],
  ["Économie générale", "economie-generale"],
];

const program = [
  ["4AP", null, "Mathématiques", 1],
  ["4AP", null, "Français", 1],
  ["4AP", null, "Arabe", 1],
  ["5AP", null, "Mathématiques", 1],
  ["5AP", null, "Français", 1],
  ["5AP", null, "Arabe", 1],
  ["6AP", null, "Mathématiques", 1],
  ["6AP", null, "Français", 1],
  ["6AP", null, "Arabe", 1],

  ["1AC", null, "Mathématiques", 2],
  ["1AC", null, "Physique-Chimie", 1],
  ["1AC", null, "SVT", 1],
  ["1AC", null, "Français", 1],
  ["2AC", null, "Mathématiques", 2],
  ["2AC", null, "Physique-Chimie", 1],
  ["2AC", null, "SVT", 1],
  ["2AC", null, "Français", 1],
  ["3AC", null, "Mathématiques", 2],
  ["3AC", null, "Physique-Chimie", 1],
  ["3AC", null, "SVT", 1],
  ["3AC", null, "Français", 1],

  ["TC", null, "Mathématiques", 2],
  ["TC", null, "Physique-Chimie", 1],
  ["TC", null, "SVT", 1],
  ["TC", null, "Anglais", 1],

  ["1BAC", null, "Mathématiques", 1],
  ["1BAC", null, "Français", 2],
  ["1BAC", null, "Arabe", 1],
  ["1BAC", null, "Histoire-Géographie", 1],

  ["2BAC", "SVT", "Mathématiques", 2],
  ["2BAC", "SVT", "Physique-Chimie", 1],
  ["2BAC", "SVT", "SVT", 2],
  ["2BAC", "SVT", "Anglais", 1],

  ["2BAC", "PC", "Mathématiques", 2],
  ["2BAC", "PC", "Physique-Chimie", 2],
  ["2BAC", "PC", "SVT", 1],
  ["2BAC", "PC", "Anglais", 1],

  ["2BAC", "ECO", "Comptabilité", 2],
  ["2BAC", "ECO", "Économie générale", 1],
  ["2BAC", "ECO", "Mathématiques", 1],
  ["2BAC", "ECO", "Anglais", 1],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();

async function upsertLevel(name) {
  const result = await client.query(
    `INSERT INTO levels (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET updated_at = now()
     RETURNING id, name`,
    [name],
  );
  return result.rows[0];
}

async function upsertSubject(name, slug) {
  const result = await client.query(
    `INSERT INTO subjects (name, slug, active)
     VALUES ($1, $2, true)
     ON CONFLICT (slug)
     DO UPDATE SET name = EXCLUDED.name, active = true, updated_at = now()
     RETURNING id, name, slug`,
    [name, slug],
  );
  return result.rows[0];
}

async function upsertStream(levelId, name) {
  const result = await client.query(
    `INSERT INTO streams (name, level_id)
     VALUES ($1, $2)
     ON CONFLICT (level_id, name)
     DO UPDATE SET updated_at = now()
     RETURNING id, name`,
    [name, levelId],
  );
  return result.rows[0];
}

try {
  await client.query("BEGIN");

  const levelByName = new Map();
  for (const name of levels) {
    const row = await upsertLevel(name);
    levelByName.set(row.name, row.id);
  }

  const subjectByName = new Map();
  for (const [name, slug] of subjects) {
    const row = await upsertSubject(name, slug);
    subjectByName.set(row.name, row.id);
  }

  const level2BacId = levelByName.get("2BAC");
  const streamByName = new Map();
  for (const streamName of ["SVT", "PC", "ECO"]) {
    const row = await upsertStream(level2BacId, streamName);
    streamByName.set(streamName, row.id);
  }

  for (const roomName of ["Salle A", "Salle B", "Salle C", "Salle D"]) {
    await client.query(
      `INSERT INTO academy_rooms (name, capacity, active)
       VALUES ($1, 40, true)
       ON CONFLICT (name)
       DO UPDATE SET capacity = 40, active = true, updated_at = now()`,
      [roomName],
    );
  }

  for (const [levelName, streamName, subjectName, weeklySessions] of program) {
    const levelId = levelByName.get(levelName);
    const streamId = streamName ? streamByName.get(streamName) : null;
    const subjectId = subjectByName.get(subjectName);

    const existing = await client.query(
      `SELECT id
       FROM academy_subject_loads
       WHERE level_id = $1
         AND stream_id IS NOT DISTINCT FROM $2::uuid
         AND subject_id = $3
       LIMIT 1`,
      [levelId, streamId, subjectId],
    );

    if (existing.rows[0]) {
      await client.query(
        `UPDATE academy_subject_loads
         SET weekly_sessions = $1, active = true, updated_at = now()
         WHERE id = $2`,
        [weeklySessions, existing.rows[0].id],
      );
    } else {
      await client.query(
        `INSERT INTO academy_subject_loads
          (level_id, stream_id, subject_id, weekly_sessions, active)
         VALUES ($1, $2, $3, $4, true)`,
        [levelId, streamId, subjectId, weeklySessions],
      );
    }
  }

  const totals = await client.query(
    `SELECT COUNT(*)::int AS rows,
            COALESCE(SUM(weekly_sessions), 0)::int AS weekly_sessions
     FROM academy_subject_loads
     WHERE active = true`,
  );

  await client.query("COMMIT");
  console.log("Academy V4 seed completed", totals.rows[0]);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
