import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { academyWeeklySessions } from "./academy-management-schema";
import { groups, studentProfiles, subjects, users } from "./schema";

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

export const homeworkSubmissionStatusEnum = pgEnum("homework_submission_status", [
  "SUBMITTED",
  "CORRECTED",
]);

export const academyAttendance = pgTable(
  "academy_attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weeklySessionId: uuid("weekly_session_id")
      .notNull()
      .references(() => academyWeeklySessions.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    sessionDate: date("session_date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    note: text("note"),
    markedByUserId: uuid("marked_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    markedAt: timestamp("marked_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_attendance_unique").on(
      table.weeklySessionId,
      table.studentProfileId,
      table.sessionDate,
    ),
    index("academy_attendance_student_date_idx").on(
      table.studentProfileId,
      table.sessionDate,
    ),
    index("academy_attendance_session_date_idx").on(
      table.weeklySessionId,
      table.sessionDate,
    ),
  ],
);

export const academyHomework = pgTable(
  "academy_homework",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    instructions: text("instructions"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("academy_homework_group_idx").on(table.groupId),
    index("academy_homework_subject_idx").on(table.subjectId),
    index("academy_homework_due_idx").on(table.dueAt),
  ],
);

export const academyHomeworkSubmissions = pgTable(
  "academy_homework_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    homeworkId: uuid("homework_id")
      .notNull()
      .references(() => academyHomework.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    status: homeworkSubmissionStatusEnum("status").notNull().default("SUBMITTED"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_homework_submission_unique").on(
      table.homeworkId,
      table.studentProfileId,
    ),
    index("academy_homework_submission_student_idx").on(table.studentProfileId),
  ],
);

export const academyHomeworkFiles = pgTable(
  "academy_homework_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => academyHomeworkSubmissions.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    dataBase64: text("data_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("academy_homework_files_submission_idx").on(table.submissionId)],
);

export const academyHomeworkCorrections = pgTable(
  "academy_homework_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => academyHomeworkSubmissions.id, { onDelete: "cascade" }),
    score: integer("score"),
    scoreMax: integer("score_max"),
    comment: text("comment"),
    correctedByUserId: uuid("corrected_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    correctedAt: timestamp("corrected_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_homework_corrections_submission_unique").on(table.submissionId),
  ],
);

export type AcademyAttendance = typeof academyAttendance.$inferSelect;
export type NewAcademyAttendance = typeof academyAttendance.$inferInsert;
export type AcademyHomework = typeof academyHomework.$inferSelect;
export type NewAcademyHomework = typeof academyHomework.$inferInsert;
export type AcademyHomeworkSubmission = typeof academyHomeworkSubmissions.$inferSelect;
export type NewAcademyHomeworkSubmission = typeof academyHomeworkSubmissions.$inferInsert;
export type AcademyHomeworkFile = typeof academyHomeworkFiles.$inferSelect;
export type NewAcademyHomeworkFile = typeof academyHomeworkFiles.$inferInsert;
export type AcademyHomeworkCorrection = typeof academyHomeworkCorrections.$inferSelect;
export type NewAcademyHomeworkCorrection = typeof academyHomeworkCorrections.$inferInsert;
