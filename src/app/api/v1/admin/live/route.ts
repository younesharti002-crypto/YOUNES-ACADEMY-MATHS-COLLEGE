import { asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, liveClasses } from "@/db/content-schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIVE_STATUSES = ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"] as const;
type LiveStatus = (typeof LIVE_STATUSES)[number];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

function uuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function text(value: unknown, max = 180) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}

function optionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function liveStatus(value: unknown): LiveStatus | null {
  return typeof value === "string" && (LIVE_STATUSES as readonly string[]).includes(value)
    ? (value as LiveStatus)
    : null;
}

async function requireAuthor(request: NextRequest) {
  return authorizeRequest(request, ["ADMIN", "TEACHER"]);
}

async function canManageCourse(courseId: string, userId: string, role: "ADMIN" | "TEACHER") {
  const [course] = await db
    .select({ id: courses.id, createdByUserId: courses.createdByUserId })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  return Boolean(course && (role === "ADMIN" || course.createdByUserId === userId));
}

async function canManageLive(liveId: string, userId: string, role: "ADMIN" | "TEACHER") {
  const [row] = await db
    .select({ courseId: liveClasses.courseId })
    .from(liveClasses)
    .where(eq(liveClasses.id, liveId))
    .limit(1);
  return row ? canManageCourse(row.courseId, userId, role) : false;
}

export async function GET(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Teacher or admin access required.",
    );
  }

  const role = authorization.session.user.role as "ADMIN" | "TEACHER";
  const userId = authorization.session.user.id;
  const courseRows = role === "ADMIN"
    ? await db.select().from(courses).orderBy(asc(courses.title))
    : await db.select().from(courses).where(eq(courses.createdByUserId, userId)).orderBy(asc(courses.title));
  const courseIds = courseRows.map((course) => course.id);
  const sessionRows = courseIds.length
    ? await db.select().from(liveClasses).where(inArray(liveClasses.courseId, courseIds)).orderBy(asc(liveClasses.scheduledAt))
    : [];

  return NextResponse.json({ data: { courses: courseRows, sessions: sessionRows } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAuthor(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Teacher or admin access required.",
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
    if (operation === "live.create") {
      const courseId = uuid(body.courseId);
      const title = text(body.title);
      const scheduledAt = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
      const durationMinutes = Number(body.durationMinutes ?? 90);
      if (!courseId || !title || !scheduledAt || Number.isNaN(scheduledAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
        return errorResponse(400, "INVALID_LIVE_CLASS", "Course, title, schedule and valid duration are required.");
      }
      if (!(await canManageCourse(courseId, userId, role))) {
        return errorResponse(403, "FORBIDDEN", "You cannot create a live class for this course.");
      }
      const [record] = await db.insert(liveClasses).values({
        courseId,
        title,
        description: optionalText(body.description),
        scheduledAt,
        durationMinutes,
        joinUrl: optionalText(body.joinUrl),
        createdByUserId: userId,
      }).returning();
      return NextResponse.json({ data: { record } }, { status: 201 });
    }

    if (operation === "status.set") {
      const id = uuid(body.id);
      const status = liveStatus(body.status);
      if (!id || !status) return errorResponse(400, "INVALID_STATUS", "Live class and status are required.");
      if (!(await canManageLive(id, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot update this live class.");
      const [record] = await db.update(liveClasses).set({ status, updatedAt: new Date() }).where(eq(liveClasses.id, id)).returning();
      return NextResponse.json({ data: { record } });
    }

    if (operation === "replay.set") {
      const id = uuid(body.id);
      if (!id) return errorResponse(400, "INVALID_REPLAY", "Live class is required.");
      if (!(await canManageLive(id, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot update this replay.");
      const [record] = await db.update(liveClasses).set({
        replayUrl: optionalText(body.replayUrl),
        replayPdfUrl: optionalText(body.replayPdfUrl),
        status: "COMPLETED",
        updatedAt: new Date(),
      }).where(eq(liveClasses.id, id)).returning();
      return NextResponse.json({ data: { record } });
    }

    if (operation === "live.delete") {
      const id = uuid(body.id);
      if (!id) return errorResponse(400, "INVALID_DELETE", "Live class is required.");
      if (!(await canManageLive(id, userId, role))) return errorResponse(403, "FORBIDDEN", "You cannot delete this live class.");
      await db.delete(liveClasses).where(eq(liveClasses.id, id));
      return NextResponse.json({ data: { deleted: true } });
    }

    return errorResponse(400, "INVALID_OPERATION", "Unsupported live operation.");
  } catch (error) {
    console.error("admin.live.operation.failed", { operation, error });
    return errorResponse(500, "LIVE_UNAVAILABLE", "Live administration is temporarily unavailable.");
  }
}
