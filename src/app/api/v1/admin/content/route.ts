import { and, asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chapters, courses, lessons } from "@/db/content-schema";
import {
  academicYears,
  levels,
  streams,
  subjects,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
type ContentStatus = (typeof STATUSES)[number];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function text(value: unknown, max = 220): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function optionalUuid(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  const parsed = uuid(value);
  return parsed ?? undefined;
}

function position(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function status(value: unknown): ContentStatus | null {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
    ? (value as ContentStatus)
    : null;
}

async function requireAuthor(request: NextRequest) {
  return authorizeRequest(request, ["ADMIN", "TEACHER"]);
}

async function canManageCourse(
  courseId: string,
  userId: string,
  role: "ADMIN" | "TEACHER",
) {
  const [course] = await db
    .select({ id: courses.id, createdByUserId: courses.createdByUserId })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) return false;
  return role === "ADMIN" || course.createdByUserId === userId;
}

async function courseIdForChapter(chapterId: string) {
  const [row] = await db
    .select({ courseId: chapters.courseId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return row?.courseId ?? null;
}

async function courseIdForLesson(lessonId: string) {
  const [row] = await db
    .select({ courseId: chapters.courseId })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row?.courseId ?? null;
}

export async function GET(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Teacher or admin access required.",
    );
  }

  const role = authorization.session.user.role;
  const userId = authorization.session.user.id;

  const [yearRows, levelRows, streamRows, subjectRows, courseRows] = await Promise.all([
    db.select().from(academicYears).orderBy(asc(academicYears.name)),
    db.select().from(levels).orderBy(asc(levels.name)),
    db.select().from(streams).orderBy(asc(streams.name)),
    db.select().from(subjects).orderBy(asc(subjects.name)),
    role === "ADMIN"
      ? db.select().from(courses).orderBy(asc(courses.title))
      : db
          .select()
          .from(courses)
          .where(eq(courses.createdByUserId, userId))
          .orderBy(asc(courses.title)),
  ]);

  const courseIds = courseRows.map((course) => course.id);
  const chapterRows = courseIds.length
    ? await db
        .select()
        .from(chapters)
        .where(inArray(chapters.courseId, courseIds))
        .orderBy(asc(chapters.position), asc(chapters.title))
    : [];
  const chapterIds = chapterRows.map((chapter) => chapter.id);
  const lessonRows = chapterIds.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.chapterId, chapterIds))
        .orderBy(asc(lessons.position), asc(lessons.title))
    : [];

  return NextResponse.json(
    {
      data: {
        academicYears: yearRows,
        levels: levelRows,
        streams: streamRows,
        subjects: subjectRows,
        courses: courseRows,
        chapters: chapterRows,
        lessons: lessonRows,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Teacher or admin access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const operation = typeof body.operation === "string" ? body.operation : "";
  const userId = authorization.session.user.id;
  const role = authorization.session.user.role as "ADMIN" | "TEACHER";

  try {
    if (operation === "course.create") {
      const title = text(body.title, 180);
      const slug = text(body.slug, 180);
      const subjectId = uuid(body.subjectId);
      const academicYearId = uuid(body.academicYearId);
      const levelId = uuid(body.levelId);
      const streamId = optionalUuid(body.streamId);
      if (
        !title ||
        !slug ||
        !/^[a-z0-9-]+$/.test(slug) ||
        !subjectId ||
        !academicYearId ||
        !levelId ||
        streamId === undefined
      ) {
        return errorResponse(400, "INVALID_COURSE", "Course title, slug and academic scope are required.");
      }
      const [record] = await db
        .insert(courses)
        .values({
          title,
          slug,
          description: optionalText(body.description),
          subjectId,
          academicYearId,
          levelId,
          streamId,
          createdByUserId: userId,
        })
        .returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "chapter.create") {
      const courseId = uuid(body.courseId);
      const title = text(body.title, 180);
      if (!courseId || !title) {
        return errorResponse(400, "INVALID_CHAPTER", "Course and chapter title are required.");
      }
      if (!(await canManageCourse(courseId, userId, role))) {
        return errorResponse(403, "FORBIDDEN", "You cannot edit this course.");
      }
      const [record] = await db
        .insert(chapters)
        .values({ courseId, title, position: position(body.position) })
        .returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "lesson.create") {
      const chapterId = uuid(body.chapterId);
      const title = text(body.title, 220);
      if (!chapterId || !title) {
        return errorResponse(400, "INVALID_LESSON", "Chapter and lesson title are required.");
      }
      const courseId = await courseIdForChapter(chapterId);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) {
        return errorResponse(403, "FORBIDDEN", "You cannot edit this chapter.");
      }
      const [record] = await db
        .insert(lessons)
        .values({
          chapterId,
          title,
          summary: optionalText(body.summary),
          videoUrl: optionalText(body.videoUrl),
          pdfUrl: optionalText(body.pdfUrl),
          position: position(body.position),
        })
        .returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "status.set") {
      const entity = typeof body.entity === "string" ? body.entity : "";
      const id = uuid(body.id);
      const nextStatus = status(body.status);
      if (!id || !nextStatus || !["course", "chapter", "lesson"].includes(entity)) {
        return errorResponse(400, "INVALID_STATUS_CHANGE", "Entity, id and status are required.");
      }

      const courseId =
        entity === "course"
          ? id
          : entity === "chapter"
            ? await courseIdForChapter(id)
            : await courseIdForLesson(id);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) {
        return errorResponse(403, "FORBIDDEN", "You cannot publish this content.");
      }

      const now = new Date();
      if (entity === "course") {
        const [record] = await db
          .update(courses)
          .set({
            status: nextStatus,
            publishedAt: nextStatus === "PUBLISHED" ? now : null,
            updatedAt: now,
          })
          .where(eq(courses.id, id))
          .returning();
        return NextResponse.json({ data: { record } });
      }
      if (entity === "chapter") {
        const [record] = await db
          .update(chapters)
          .set({ status: nextStatus, updatedAt: now })
          .where(eq(chapters.id, id))
          .returning();
        return NextResponse.json({ data: { record } });
      }
      const [record] = await db
        .update(lessons)
        .set({
          status: nextStatus,
          publishedAt: nextStatus === "PUBLISHED" ? now : null,
          updatedAt: now,
        })
        .where(eq(lessons.id, id))
        .returning();
      return NextResponse.json({ data: { record } });
    }

    if (operation === "content.delete") {
      const entity = typeof body.entity === "string" ? body.entity : "";
      const id = uuid(body.id);
      if (!id || !["course", "chapter", "lesson"].includes(entity)) {
        return errorResponse(400, "INVALID_DELETE", "Entity and id are required.");
      }
      const courseId =
        entity === "course"
          ? id
          : entity === "chapter"
            ? await courseIdForChapter(id)
            : await courseIdForLesson(id);
      if (!courseId || !(await canManageCourse(courseId, userId, role))) {
        return errorResponse(403, "FORBIDDEN", "You cannot delete this content.");
      }
      if (entity === "course") await db.delete(courses).where(eq(courses.id, id));
      if (entity === "chapter") await db.delete(chapters).where(eq(chapters.id, id));
      if (entity === "lesson") await db.delete(lessons).where(eq(lessons.id, id));
      return NextResponse.json({ data: { deleted: true } });
    }

    return errorResponse(400, "INVALID_OPERATION", "Unsupported content operation.");
  } catch (error) {
    const pgCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    if (pgCode === "23505") {
      return errorResponse(409, "DUPLICATE_RECORD", "A record with these values already exists.");
    }
    if (pgCode === "23503") {
      return errorResponse(409, "INVALID_REFERENCE", "The selected academic record no longer exists.");
    }
    console.error("admin.content.operation.failed", { operation, pgCode });
    return errorResponse(500, "CONTENT_UNAVAILABLE", "Content administration is temporarily unavailable.");
  }
}
