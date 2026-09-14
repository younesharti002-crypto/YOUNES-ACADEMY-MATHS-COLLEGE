import { asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentChoices, assessmentQuestions, assessments } from "@/db/assessment-schema";
import { courses } from "@/db/content-schema";
import { validateAssessmentPublish } from "@/lib/assessments/publish-validation";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = ["EXERCISE", "QUIZ"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}
function uuid(value: unknown) { return typeof value === "string" && UUID_PATTERN.test(value) ? value : null; }
function text(value: unknown, max = 5000) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}
function optionalText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : null;
}
function integer(value: unknown, fallback = 0, min = 0, max = 10000) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

async function requireAuthor(request: NextRequest) {
  return authorizeRequest(request, ["ADMIN", "TEACHER"]);
}
async function canManageCourse(courseId: string, userId: string, role: "ADMIN" | "TEACHER") {
  const [course] = await db.select({ id: courses.id, createdByUserId: courses.createdByUserId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  return Boolean(course && (role === "ADMIN" || course.createdByUserId === userId));
}
async function courseForAssessment(assessmentId: string) {
  const [row] = await db.select({ courseId: assessments.courseId }).from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  return row?.courseId ?? null;
}
async function assessmentForQuestion(questionId: string) {
  const [row] = await db.select({ assessmentId: assessmentQuestions.assessmentId }).from(assessmentQuestions).where(eq(assessmentQuestions.id, questionId)).limit(1);
  return row?.assessmentId ?? null;
}

export async function GET(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) return errorResponse(authorization.reason === "UNAUTHENTICATED" ? 401 : 403, authorization.reason, "Teacher or admin access required.");

  const role = authorization.session.user.role as "ADMIN" | "TEACHER";
  const userId = authorization.session.user.id;
  const courseRows = role === "ADMIN"
    ? await db.select().from(courses).orderBy(asc(courses.title))
    : await db.select().from(courses).where(eq(courses.createdByUserId, userId)).orderBy(asc(courses.title));
  const courseIds = courseRows.map((row) => row.id);
  const assessmentRows = courseIds.length
    ? await db.select().from(assessments).where(inArray(assessments.courseId, courseIds)).orderBy(asc(assessments.title))
    : [];
  const assessmentIds = assessmentRows.map((row) => row.id);
  const questionRows = assessmentIds.length
    ? await db.select().from(assessmentQuestions).where(inArray(assessmentQuestions.assessmentId, assessmentIds)).orderBy(asc(assessmentQuestions.position))
    : [];
  const questionIds = questionRows.map((row) => row.id);
  const choiceRows = questionIds.length
    ? await db.select().from(assessmentChoices).where(inArray(assessmentChoices.questionId, questionIds)).orderBy(asc(assessmentChoices.position))
    : [];

  return NextResponse.json({ data: { courses: courseRows, assessments: assessmentRows, questions: questionRows, choices: choiceRows } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) return errorResponse(authorization.reason === "UNAUTHENTICATED" ? 401 : 403, authorization.reason, "Teacher or admin access required.");

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return errorResponse(400, "INVALID_REQUEST", "Invalid request body."); }
  const operation = typeof body.operation === "string" ? body.operation : "";
  const role = authorization.session.user.role as "ADMIN" | "TEACHER";
  const userId = authorization.session.user.id;

  try {
    if (operation === "assessment.create") {
      const courseId = uuid(body.courseId);
      const title = text(body.title, 180);
      const kind = typeof body.kind === "string" && (KINDS as readonly string[]).includes(body.kind) ? body.kind as (typeof KINDS)[number] : null;
      if (!courseId || !title || !kind) return errorResponse(400, "INVALID_ASSESSMENT", "Course, title and kind are required.");
      if (!(await canManageCourse(courseId, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot edit this course.");
      const [record] = await db.insert(assessments).values({
        courseId, title, kind, description: optionalText(body.description),
        passingPercent: integer(body.passingPercent, 50, 0, 100), createdByUserId: userId,
      }).returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "question.create") {
      const assessmentId = uuid(body.assessmentId);
      const prompt = text(body.prompt);
      if (!assessmentId || !prompt) return errorResponse(400, "INVALID_QUESTION", "Assessment and prompt are required.");
      const courseId = await courseForAssessment(assessmentId);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot edit this assessment.");
      const [record] = await db.insert(assessmentQuestions).values({
        assessmentId, prompt, explanation: optionalText(body.explanation),
        position: integer(body.position, 0, 0, 10000), points: integer(body.points, 1, 1, 100),
      }).returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "choice.create") {
      const questionId = uuid(body.questionId);
      const label = text(body.label);
      if (!questionId || !label) return errorResponse(400, "INVALID_CHOICE", "Question and choice label are required.");
      const assessmentId = await assessmentForQuestion(questionId);
      const courseId = assessmentId ? await courseForAssessment(assessmentId) : null;
      if (!courseId || !(await canManageCourse(courseId, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot edit this question.");
      const [record] = await db.insert(assessmentChoices).values({
        questionId, label, position: integer(body.position, 0, 0, 10000), isCorrect: body.isCorrect === true,
      }).returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "status.set") {
      const assessmentId = uuid(body.assessmentId);
      const status = typeof body.status === "string" && (STATUSES as readonly string[]).includes(body.status) ? body.status as (typeof STATUSES)[number] : null;
      if (!assessmentId || !status) return errorResponse(400, "INVALID_STATUS", "Assessment and status are required.");
      const courseId = await courseForAssessment(assessmentId);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot publish this assessment.");
      if (status === "PUBLISHED") {
        const questions = await db.select({ id: assessmentQuestions.id }).from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, assessmentId));
        const choices = questions.length
          ? await db.select({ questionId: assessmentChoices.questionId, isCorrect: assessmentChoices.isCorrect }).from(assessmentChoices).where(inArray(assessmentChoices.questionId, questions.map((q) => q.id)))
          : [];
        const issue = validateAssessmentPublish(questions.map((question) => question.id), choices);
        if (issue === "QUESTION_REQUIRED") return errorResponse(409, issue, "Add at least one question before publishing.");
        if (issue === "CHOICES_REQUIRED") return errorResponse(409, issue, "Each question needs at least two choices.");
        if (issue === "EXACTLY_ONE_CORRECT_REQUIRED") return errorResponse(409, issue, "Each question needs exactly one correct choice.");
      }
      const [record] = await db.update(assessments).set({ status, updatedAt: new Date() }).where(eq(assessments.id, assessmentId)).returning();
      return NextResponse.json({ data: { record } });
    }

    if (operation === "assessment.delete") {
      const assessmentId = uuid(body.assessmentId);
      if (!assessmentId) return errorResponse(400, "INVALID_DELETE", "Assessment is required.");
      const courseId = await courseForAssessment(assessmentId);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot delete this assessment.");
      await db.delete(assessments).where(eq(assessments.id, assessmentId));
      return NextResponse.json({ data: { deleted: true } });
    }

    return errorResponse(400, "INVALID_OPERATION", "Unsupported assessment operation.");
  } catch (error) {
    console.error("admin.assessment.operation.failed", { operation, error });
    return errorResponse(500, "ASSESSMENT_UNAVAILABLE", "Assessment administration is temporarily unavailable.");
  }
}
