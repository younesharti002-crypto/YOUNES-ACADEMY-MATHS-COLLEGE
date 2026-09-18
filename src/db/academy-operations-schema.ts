import {
  boolean,
  customType,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { academyWeeklySessions } from "./academy-management-schema";
import { groups, studentProfiles, subjects, users } from "./schema";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

export const submissionStatusEnum = pgEnum("academy_submission_status", [
  "SUBMITTED",
  "IN_REVIEW",
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

export const academyAssignments = pgTable(
  "academy_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherUserId: uuid("teacher_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 220 }).notNull(),
    instructions: text("instructions"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("academy_assignments_group_idx").on(table.groupId),
    index("academy_assignments_subject_idx").on(table.subjectId),
    index("academy_assignments_teacher_idx").on(table.teacherUserId),
    index("academy_assignments_due_idx").on(table.dueAt),
  ],
);

export const academySubmissions = pgTable(
  "academy_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => academyAssignments.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("SUBMITTED"),
    studentComment: text("student_comment"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_submissions_assignment_student_unique").on(
      table.assignmentId,
      table.studentProfileId,
    ),
    index("academy_submissions_student_idx").on(table.studentProfileId),
    index("academy_submissions_assignment_idx").on(table.assignmentId),
    index("academy_submissions_status_idx").on(table.status),
  ],
);

export const academySubmissionFiles = pgTable(
  "academy_submission_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => academySubmissions.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    content: bytea("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("academy_submission_files_submission_idx").on(table.submissionId)],
);

export const academyCorrections = pgTable(
  "academy_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => academySubmissions.id, { onDelete: "cascade" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    score: numeric("score", { precision: 7, scale: 2 }),
    scoreMax: numeric("score_max", { precision: 7, scale: 2 }),
    comment: text("comment"),
    correctedAt: timestamp("corrected_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_corrections_submission_unique").on(table.submissionId),
    index("academy_corrections_teacher_idx").on(table.teacherUserId),
  ],
);

export type AcademyAttendance = typeof academyAttendance.$inferSelect;
export type NewAcademyAttendance = typeof academyAttendance.$inferInsert;
export type AcademyAssignment = typeof academyAssignments.$inferSelect;
export type NewAcademyAssignment = typeof academyAssignments.$inferInsert;
export type AcademySubmission = typeof academySubmissions.$inferSelect;
export type NewAcademySubmission = typeof academySubmissions.$inferInsert;
export type AcademySubmissionFile = typeof academySubmissionFiles.$inferSelect;
export type NewAcademySubmissionFile = typeof academySubmissionFiles.$inferInsert;
export type AcademyCorrection = typeof academyCorrections.$inferSelect;
export type NewAcademyCorrection = typeof academyCorrections.$inferInsert;
