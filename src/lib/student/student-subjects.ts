import { pool } from "@/db";

export type StudentSubjectCard = {
  subjectName: string;
  levelName: string;
  streamName: string | null;
  weeklySessions: number;
};

export async function getStudentSubjects(userId: string): Promise<StudentSubjectCard[]> {
  const result = await pool.query<StudentSubjectCard>(
    `
      SELECT
        subjects.name AS "subjectName",
        levels.name AS "levelName",
        streams.name AS "streamName",
        academy_subject_loads.weekly_sessions AS "weeklySessions"
      FROM student_profiles
      INNER JOIN levels ON levels.id = student_profiles.level_id
      LEFT JOIN streams ON streams.id = student_profiles.stream_id
      INNER JOIN academy_subject_loads
        ON academy_subject_loads.level_id = student_profiles.level_id
       AND academy_subject_loads.stream_id IS NOT DISTINCT FROM student_profiles.stream_id
       AND academy_subject_loads.active = true
      INNER JOIN subjects
        ON subjects.id = academy_subject_loads.subject_id
       AND subjects.active = true
      WHERE student_profiles.user_id = $1
      ORDER BY subjects.name ASC
    `,
    [userId],
  );

  return result.rows.map((row) => ({
    subjectName: row.subjectName,
    levelName: row.levelName,
    streamName: row.streamName,
    weeklySessions: Number(row.weeklySessions || 0),
  }));
}
