import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "REGISTERED",
  "ARCHIVED",
]);

export const registrationLeads = pgTable(
  "registration_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    level: varchar("level", { length: 80 }).notNull(),
    subject: varchar("subject", { length: 120 }).notNull(),
    source: varchar("source", { length: 80 }).default("landing_page").notNull(),
    message: text("message"),
    status: leadStatusEnum("status").default("NEW").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("registration_leads_phone_idx").on(table.phone),
    index("registration_leads_status_idx").on(table.status),
    index("registration_leads_created_at_idx").on(table.createdAt),
  ],
);

export type RegistrationLead = typeof registrationLeads.$inferSelect;
export type NewRegistrationLead = typeof registrationLeads.$inferInsert;
