import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { groups, levels, streams, subjects, users } from "./schema";

export const academyDayEnum = pgEnum("academy_day", [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

export const academySessionStatusEnum = pgEnum("academy_session_status", [
  "PLANNED",
  "ACTIVE",
  "CANCELLED",
]);

export const academyRooms = pgTable(
  "academy_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    capacity: integer("capacity").notNull().default(40),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_rooms_name_unique").on(table.name),
    index("academy_rooms_active_idx").on(table.active),
  ],
);

export const academySubjectLoads = pgTable(
  "academy_subject_loads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    streamId: uuid("stream_id").references(() => streams.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    weeklySessions: integer("weekly_sessions").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("academy_subject_loads_level_idx").on(table.levelId),
    index("academy_subject_loads_stream_idx").on(table.streamId),
    index("academy_subject_loads_subject_idx").on(table.subjectId),
    index("academy_subject_loads_active_idx").on(table.active),
  ],
);

export const academyWeeklySessions = pgTable(
  "academy_weekly_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => academyRooms.id, { onDelete: "restrict" }),
    teacherUserId: uuid("teacher_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    day: academyDayEnum("day").notNull(),
    startsAt: time("starts_at", { withTimezone: false }).notNull(),
    endsAt: time("ends_at", { withTimezone: false }).notNull(),
    status: academySessionStatusEnum("status").notNull().default("PLANNED"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("academy_weekly_sessions_group_idx").on(table.groupId),
    index("academy_weekly_sessions_subject_idx").on(table.subjectId),
    index("academy_weekly_sessions_teacher_idx").on(table.teacherUserId),
    index("academy_weekly_sessions_day_idx").on(table.day),
    uniqueIndex("academy_weekly_sessions_room_slot_unique").on(
      table.roomId,
      table.day,
      table.startsAt,
    ),
    uniqueIndex("academy_weekly_sessions_group_slot_unique").on(
      table.groupId,
      table.day,
      table.startsAt,
    ),
  ],
);

export type AcademyRoom = typeof academyRooms.$inferSelect;
export type NewAcademyRoom = typeof academyRooms.$inferInsert;
export type AcademySubjectLoad = typeof academySubjectLoads.$inferSelect;
export type NewAcademySubjectLoad = typeof academySubjectLoads.$inferInsert;
export type AcademyWeeklySession = typeof academyWeeklySessions.$inferSelect;
export type NewAcademyWeeklySession = typeof academyWeeklySessions.$inferInsert;
