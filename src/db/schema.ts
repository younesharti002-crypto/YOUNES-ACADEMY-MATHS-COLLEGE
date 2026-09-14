import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "PARENT",
  "TEACHER",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "DISABLED"]);

export const preferredLanguageEnum = pgEnum("preferred_language", ["ar", "fr"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  preferredLanguage: preferredLanguageEnum("preferred_language")
    .default("ar")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("academic_years_active_idx").on(table.active),
    check("academic_years_date_order_check", sql`${table.endsAt} >= ${table.startsAt}`),
  ],
);

export const levels = pgTable("levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const streams = pgTable(
  "streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("streams_level_idx").on(table.levelId),
    uniqueIndex("streams_level_name_unique").on(table.levelId, table.name),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("subjects_active_idx").on(table.active)],
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "restrict" }),
    streamId: uuid("stream_id").references(() => streams.id, {
      onDelete: "restrict",
    }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("groups_academic_year_idx").on(table.academicYearId),
    index("groups_level_idx").on(table.levelId),
    index("groups_stream_idx").on(table.streamId),
    index("groups_active_idx").on(table.active),
    uniqueIndex("groups_scope_name_unique").on(
      table.academicYearId,
      table.levelId,
      table.streamId,
      table.name,
    ),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    description: text("description"),
    academicYearId: uuid("academic_year_id").references(() => academicYears.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("offers_active_idx").on(table.active),
    index("offers_academic_year_idx").on(table.academicYearId),
    check(
      "offers_date_order_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt}`,
    ),
  ],
);

export const studentSubscriptions = pgTable(
  "student_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").default("PENDING").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("student_subscriptions_student_idx").on(table.studentId),
    index("student_subscriptions_offer_idx").on(table.offerId),
    index("student_subscriptions_status_idx").on(table.status),
    index("student_subscriptions_lookup_idx").on(
      table.studentId,
      table.offerId,
      table.status,
    ),
    uniqueIndex("student_subscriptions_current_unique")
      .on(table.studentId, table.offerId)
      .where(sql`${table.status} in ('PENDING', 'ACTIVE', 'SUSPENDED')`),
    check(
      "student_subscriptions_date_order_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt}`,
    ),
  ],
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "restrict" }),
    streamId: uuid("stream_id").references(() => streams.id, {
      onDelete: "restrict",
    }),
    primaryGroupId: uuid("primary_group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    studentCode: varchar("student_code", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("student_profiles_user_unique").on(table.userId),
    uniqueIndex("student_profiles_code_unique").on(table.studentCode),
    index("student_profiles_level_idx").on(table.levelId),
    index("student_profiles_stream_idx").on(table.streamId),
    index("student_profiles_primary_group_idx").on(table.primaryGroupId),
  ],
);

export const parentProfiles = pgTable(
  "parent_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("parent_profiles_user_unique").on(table.userId)],
);

export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("teacher_profiles_user_unique").on(table.userId)],
);

export const parentStudents = pgTable(
  "parent_students",
  {
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parentProfiles.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    relationship: varchar("relationship", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("parent_students_unique").on(table.parentId, table.studentId),
    index("parent_students_student_idx").on(table.studentId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type AcademicYear = typeof academicYears.$inferSelect;
export type NewAcademicYear = typeof academicYears.$inferInsert;
export type Level = typeof levels.$inferSelect;
export type NewLevel = typeof levels.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type StudentSubscription = typeof studentSubscriptions.$inferSelect;
export type NewStudentSubscription = typeof studentSubscriptions.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type NewStudentProfile = typeof studentProfiles.$inferInsert;
export type ParentProfile = typeof parentProfiles.$inferSelect;
export type NewParentProfile = typeof parentProfiles.$inferInsert;
export type TeacherProfile = typeof teacherProfiles.$inferSelect;
export type NewTeacherProfile = typeof teacherProfiles.$inferInsert;
export type ParentStudent = typeof parentStudents.$inferSelect;
export type NewParentStudent = typeof parentStudents.$inferInsert;
