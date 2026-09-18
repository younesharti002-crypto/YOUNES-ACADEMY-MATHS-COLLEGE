import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { academyWeeklySessions } from "./academy-management-schema";
import { studentProfiles, users } from "./schema";

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
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

export type AcademyAttendance = typeof academyAttendance.$inferSelect;
export type NewAcademyAttendance = typeof academyAttendance.$inferInsert;
