import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentAnswers, assessmentAttempts, assessmentChoices, assessmentQuestions, assessments } from "@/db/assessment-schema";
import { courses } from "@/db/content-schema";
import { studentProfiles, subjects } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}
function uuid(value: unknown) { return typeof value === "string" && UUID_PATTERN.test(value) ? value : null; }

async function entitledCourseIds(userId: string) {
  const [profile] = await db.select({ levelId: studentProfiles.levelId, streamId: studentProfiles.streamId }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  if (!profile) return { ok: false as const, code: "STUDENT_PROFILE_REQUIRED", courseIds: [] as string[] };
  const access = await getStudentSubscriptionAccess(userId);
  if (access.state !== "ACTIVE" || access.entitledAcademicYearIds.length === 0) {
    return { ok: false as const, code: `SUBSCRIPTION_${access.state === "NONE" ? "REQUIRED" : access.state}`, courseIds: [] as string[] };
  }
  const streamCondition = profile.streamId ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId)) : isNull(courses.streamId);
  const rows = await db.select({ id: courses.id }).from(courses).where(and(
    eq(courses.status, "PUBLISHED"), eq(courses.levelId, profile.levelId),
    inArray(courses.academicYearId, access.entitledAcademicYearIds), streamCondition,
  ));
  return { ok: true as const, code: "ACTIVE", courseIds: rows.map((row) => row.id) };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) return errorResponse(authorization.reason === "UNAUTHENTICATED" ? 401 : 403, authorization.reason, "Student access required.");
  const userId = authorization.session.user.id;
  const entitlement = await entitledCourseIds(userId);
  if (!entitlement.ok) return errorResponse(403, entitlement.code, "An active subscription is required.");

  if (!entitlement.courseIds.length) return NextResponse.json({ data: { assessments: [], questions: [], choices: [], attempts: [] } });
  const assessmentRows = await db.select({
    id: assessments.id, courseId: assessments.courseId, courseTitle: courses.title, subjectName: subjects.name,
    title: assessments.title, description: assessments.description, kind: assessments.kind,
    passingPercent: assessments.passingPercent,
  }).from(assessments)
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(and(inArray(assessments.courseId, entitlement.courseIds), eq(assessments.status, "PUBLISHED")))
    .orderBy(asc(assessments.title));

  const assessmentIds = assessmentRows.map((row) => row.id);
  const questionRows = assessmentIds.length ? await db.select({
    id: assessmentQuestions.id, assessmentId: assessmentQuestions.assessmentId, prompt: assessmentQuestions.prompt,
    position: assessmentQuestions.position, points: assessmentQuestions.points,
  }).from(assessmentQuestions).where(inArray(assessmentQuestions.assessmentId, assessmentIds)).orderBy(asc(assessmentQuestions.position)) : [];
  const questionIds = questionRows.map((row) => row.id);
  const choiceRows = questionIds.length ? await db.select({
    id: assessmentChoices.id, questionId: assessmentChoices.questionId, label: assessmentChoices.label, position: assessmentChoices.position,
  }).from(assessmentChoices).where(inArray(assessmentChoices.questionId, questionIds)).orderBy(asc(assessmentChoices.position)) : [];
  const attemptRows = assessmentIds.length ? await db.select({
    id: assessmentAttempts.id, assessmentId: assessmentAttempts.assessmentId, score: assessmentAttempts.score,
    maxScore: assessmentAttempts.maxScore, percent: assessmentAttempts.percent, submittedAt: assessmentAttempts.submittedAt,
  }).from(assessmentAttempts).where(and(eq(assessmentAttempts.studentId, userId), inArray(assessmentAttempts.assessmentId, assessmentIds))).orderBy(desc(assessmentAttempts.submittedAt)) : [];

  return NextResponse.json({ data: { assessments: assessmentRows, questions: questionRows, choices: choiceRows, attempts: attemptRows } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) return errorResponse(authorization.reason === "UNAUTHENTICATED" ? 401 : 403, authorization.reason, "Student access required.");
  const userId = authorization.session.user.id;
  const entitlement = await entitledCourseIds(userId);
  if (!entitlement.ok) return errorResponse(403, entitlement.code, "An active subscription is required.");

  let body: { assessmentId?: unknown; answers?: unknown };
  try { body = await request.json() as typeof body; } catch { return errorResponse(400, "INVALID_REQUEST", "Invalid request body."); }
  const assessmentId = uuid(body.assessmentId);
  if (!assessmentId || !Array.isArray(body.answers)) return errorResponse(400, "INVALID_SUBMISSION", "Assessment and answers are required.");

  const [assessment] = await db.select({ id: assessments.id, courseId: assessments.courseId, passingPercent: assessments.passingPercent }).from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.status, "PUBLISHED"))).limit(1);
  if (!assessment || !entitlement.courseIds.includes(assessment.courseId)) return errorResponse(404, "ASSESSMENT_NOT_FOUND", "Assessment is not available for this student.");

  const questions = await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, assessmentId)).orderBy(asc(assessmentQuestions.position));
  if (!questions.length) return errorResponse(409, "ASSESSMENT_EMPTY", "Assessment has no questions.");
  const questionIds = questions.map((q) => q.id);
  const choices = await db.select().from(assessmentChoices).where(inArray(assessmentChoices.questionId, questionIds));

  const submitted = new Map<string, string>();
  for (const raw of body.answers as Array<unknown>) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const questionId = uuid(item.questionId);
    const choiceId = uuid(item.choiceId);
    if (questionId && choiceId && questionIds.includes(questionId)) submitted.set(questionId, choiceId);
  }

  const review = questions.map((question) => {
    const selectedChoiceId = submitted.get(question.id) ?? null;
    const selected = selectedChoiceId ? choices.find((choice) => choice.id === selectedChoiceId && choice.questionId === question.id) : null;
    const correctChoices = choices.filter((choice) => choice.questionId === question.id && choice.isCorrect);
    const correct = Boolean(selected?.isCorrect);
    return {
      questionId: question.id,
      selectedChoiceId: selected?.id ?? null,
      isCorrect: correct,
      earnedPoints: correct ? question.points : 0,
      points: question.points,
      explanation: question.explanation,
      correctChoiceIds: correctChoices.map((choice) => choice.id),
    };
  });
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
  const score = review.reduce((sum, answer) => sum + answer.earnedPoints, 0);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const result = await db.transaction(async (tx) => {
    const [attempt] = await tx.insert(assessmentAttempts).values({ assessmentId, studentId: userId, score, maxScore, percent }).returning();
    await tx.insert(assessmentAnswers).values(review.map((answer) => ({
      attemptId: attempt.id, questionId: answer.questionId, selectedChoiceId: answer.selectedChoiceId,
      isCorrect: answer.isCorrect, earnedPoints: answer.earnedPoints,
    })));
    return attempt;
  });

  return NextResponse.json({ data: {
    attempt: result, passed: percent >= assessment.passingPercent, passingPercent: assessment.passingPercent, review,
  } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
