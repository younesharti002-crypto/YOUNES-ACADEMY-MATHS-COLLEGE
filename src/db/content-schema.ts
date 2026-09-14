import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  academicYears,
  levels,
  streams,
  subjects,
  users,
} from "@/db/schema";

export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "restrict" }),
    streamId: uuid("stream_id").references(() => streams.id, {
      onDelete: "restrict",
    }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_subject_idx").on(table.subjectId),
    index("courses_scope_idx").on(
      table.academicYearId,
      table.levelId,
      table.streamId,
    ),
    index("courses_status_idx").on(table.status),
    index("courses_created_by_idx").on(table.createdByUserId),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    position: integer("position").default(0).notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chapters_course_position_idx").on(table.courseId, table.position),
    index("chapters_status_idx").on(table.status),
    check("chapters_position_check", sql`${table.position} >= 0`),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 220 }).notNull(),
    summary: text("summary"),
    videoUrl: text("video_url"),
    pdfUrl: text("pdf_url"),
    position: integer("position").default(0).notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("lessons_chapter_position_idx").on(table.chapterId, table.position),
    index("lessons_status_idx").on(table.status),
    check("lessons_position_check", sql`${table.position} >= 0`),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("STARTED").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lesson_progress_student_lesson_unique").on(table.studentId, table.lessonId),
    index("lesson_progress_student_idx").on(table.studentId),
    index("lesson_progress_lesson_idx").on(table.lessonId),
    check("lesson_progress_status_check", sql`${table.status} in ('STARTED', 'COMPLETED')`),
  ],
);

export const liveClasses = pgTable(
  "live_classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").default(90).notNull(),
    joinUrl: text("join_url"),
    replayUrl: text("replay_url"),
    replayPdfUrl: text("replay_pdf_url"),
    status: varchar("status", { length: 20 }).default("SCHEDULED").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("live_classes_course_scheduled_idx").on(table.courseId, table.scheduledAt),
    index("live_classes_status_scheduled_idx").on(table.status, table.scheduledAt),
    check(
      "live_classes_status_check",
      sql`${table.status} in ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')`,
    ),
    check(
      "live_classes_duration_check",
      sql`${table.durationMinutes} > 0 and ${table.durationMinutes} <= 300`,
    ),
  ],
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type LiveClass = typeof liveClasses.$inferSelect;
export type NewLiveClass = typeof liveClasses.$inferInsert;
