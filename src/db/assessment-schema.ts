import { boolean, index, integer, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { courses } from "@/db/content-schema";
import { users } from "@/db/schema";

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    kind: varchar("kind", { length: 20 }).default("QUIZ").notNull(),
    status: varchar("status", { length: 20 }).default("DRAFT").notNull(),
    passingPercent: integer("passing_percent").default(50).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("assessments_course_status_idx").on(table.courseId, table.status)],
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    position: integer("position").default(0).notNull(),
    points: integer("points").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("assessment_questions_assessment_position_idx").on(table.assessmentId, table.position)],
);

export const assessmentChoices = pgTable(
  "assessment_choices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").default(0).notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
  },
  (table) => [index("assessment_choices_question_position_idx").on(table.questionId, table.position)],
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").default(0).notNull(),
    maxScore: integer("max_score").default(0).notNull(),
    percent: integer("percent").default(0).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("assessment_attempts_student_submitted_idx").on(table.studentId, table.submittedAt),
    index("assessment_attempts_assessment_student_idx").on(table.assessmentId, table.studentId),
  ],
);

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    selectedChoiceId: uuid("selected_choice_id").references(() => assessmentChoices.id, { onDelete: "set null" }),
    isCorrect: boolean("is_correct").default(false).notNull(),
    earnedPoints: integer("earned_points").default(0).notNull(),
  },
  (table) => [
    index("assessment_answers_attempt_idx").on(table.attemptId),
    unique("assessment_answers_attempt_question_unique").on(table.attemptId, table.questionId),
  ],
);

export type Assessment = typeof assessments.$inferSelect;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type AssessmentChoice = typeof assessmentChoices.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
