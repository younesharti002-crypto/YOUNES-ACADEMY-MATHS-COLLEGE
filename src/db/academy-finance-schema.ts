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
import { studentProfiles, subjects, users } from "./schema";

export const academyBillingStatusEnum = pgEnum("academy_billing_status", [
  "UNPAID",
  "PARTIAL",
  "PAID",
]);

export const academyPaymentMethodEnum = pgEnum("academy_payment_method", [
  "CASH",
  "TRANSFER",
  "OTHER",
]);

export const academyBillingItems = pgTable(
  "academy_billing_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    billingMonth: date("billing_month").notNull(),
    expectedAmountCentimes: integer("expected_amount_centimes").notNull(),
    paidAmountCentimes: integer("paid_amount_centimes").notNull().default(0),
    status: academyBillingStatusEnum("status").notNull().default("UNPAID"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("academy_billing_item_unique").on(
      table.studentProfileId,
      table.subjectId,
      table.billingMonth,
    ),
    index("academy_billing_student_idx").on(table.studentProfileId),
    index("academy_billing_subject_idx").on(table.subjectId),
    index("academy_billing_month_idx").on(table.billingMonth),
    index("academy_billing_status_idx").on(table.status),
  ],
);

export const academyPaymentTransactions = pgTable(
  "academy_payment_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    billingItemId: uuid("billing_item_id")
      .notNull()
      .references(() => academyBillingItems.id, { onDelete: "cascade" }),
    amountCentimes: integer("amount_centimes").notNull(),
    teacherShareCentimes: integer("teacher_share_centimes").notNull(),
    schoolShareCentimes: integer("school_share_centimes").notNull(),
    academyShareCentimes: integer("academy_share_centimes").notNull(),
    method: academyPaymentMethodEnum("method").notNull().default("CASH"),
    reference: text("reference"),
    notes: text("notes"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    recordedByUserId: uuid("recorded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("academy_payment_billing_idx").on(table.billingItemId),
    index("academy_payment_received_idx").on(table.receivedAt),
    index("academy_payment_recorded_by_idx").on(table.recordedByUserId),
  ],
);

export type AcademyBillingItem = typeof academyBillingItems.$inferSelect;
export type NewAcademyBillingItem = typeof academyBillingItems.$inferInsert;
export type AcademyPaymentTransaction = typeof academyPaymentTransactions.$inferSelect;
export type NewAcademyPaymentTransaction = typeof academyPaymentTransactions.$inferInsert;
