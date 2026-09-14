import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academicYears,
  groups,
  levels,
  offers,
  streams,
  studentProfiles,
  studentSubscriptions,
  subjects,
  users,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { normalizeMoroccanPhone } from "@/lib/auth/phone";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTITIES = ["academicYear", "level", "stream", "group", "subject", "student"] as const;
type Entity = (typeof ENTITIES)[number];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isEntity(value: unknown): value is Entity {
  return typeof value === "string" && (ENTITIES as readonly string[]).includes(value);
}

function text(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function optionalUuid(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  const parsed = uuid(value);
  return parsed ?? undefined;
}

function date(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireAdmin(request: NextRequest) {
  return authorizeRequest(request, ["ADMIN"]);
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Admin access required.",
    );
  }

  const [years, levelRows, streamRows, groupRows, subjectRows, students] = await Promise.all([
    db.select().from(academicYears).orderBy(asc(academicYears.name)),
    db.select().from(levels).orderBy(asc(levels.name)),
    db.select().from(streams).orderBy(asc(streams.name)),
    db.select().from(groups).orderBy(asc(groups.name)),
    db.select().from(subjects).orderBy(asc(subjects.name)),
    db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        studentCode: studentProfiles.studentCode,
        levelId: studentProfiles.levelId,
        streamId: studentProfiles.streamId,
        primaryGroupId: studentProfiles.primaryGroupId,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .orderBy(asc(users.fullName)),
  ]);

  return NextResponse.json(
    { data: { academicYears: years, levels: levelRows, streams: streamRows, groups: groupRows, subjects: subjectRows, students } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Admin access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  if (!isEntity(body.entity) || !["create", "update", "delete"].includes(String(body.action))) {
    return errorResponse(400, "INVALID_REQUEST", "Unsupported academic operation.");
  }

  const entity = body.entity;
  const action = String(body.action);

  if (entity === "student") {
    if (action !== "create") {
      return errorResponse(400, "INVALID_STUDENT_OPERATION", "Only student creation is supported here.");
    }

    const fullName = text(body.fullName, 160);
    const phone = typeof body.phone === "string" ? normalizeMoroccanPhone(body.phone) : null;
    const password = typeof body.password === "string" ? body.password : "";
    const studentCode = text(body.studentCode, 64);
    const levelId = uuid(body.levelId);
    const groupId = optionalUuid(body.groupId);

    if (!fullName || !phone || password.length < 8 || password.length > 128 || !studentCode || !levelId || groupId === undefined) {
      return errorResponse(400, "INVALID_STUDENT", "Name, Moroccan phone, password, student code and level are required.");
    }

    try {
      const [level] = await db.select({ id: levels.id }).from(levels).where(eq(levels.id, levelId)).limit(1);
      if (!level) return errorResponse(404, "LEVEL_NOT_FOUND", "Level not found.");

      let streamId: string | null = null;
      if (groupId) {
        const [group] = await db
          .select({ id: groups.id, levelId: groups.levelId, streamId: groups.streamId, active: groups.active })
          .from(groups)
          .where(eq(groups.id, groupId))
          .limit(1);
        if (!group) return errorResponse(404, "GROUP_NOT_FOUND", "Group not found.");
        if (!group.active || group.levelId !== levelId) {
          return errorResponse(409, "GROUP_MISMATCH", "The selected group is not active or does not match the level.");
        }
        streamId = group.streamId;
      }

      const [offer] = await db
        .select({ id: offers.id, endsAt: offers.endsAt })
        .from(offers)
        .where(eq(offers.active, true))
        .orderBy(asc(offers.createdAt))
        .limit(1);
      if (!offer) return errorResponse(409, "NO_ACTIVE_OFFER", "Create an active offer before adding students.");

      const passwordHash = await hashPassword(password);
      const now = new Date();
      const record = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ fullName, phone, passwordHash, role: "STUDENT", status: "ACTIVE", preferredLanguage: "ar" })
          .returning({ id: users.id, fullName: users.fullName, phone: users.phone, status: users.status });

        const [profile] = await tx
          .insert(studentProfiles)
          .values({ userId: user.id, levelId, streamId, primaryGroupId: groupId, studentCode })
          .returning();

        await tx.insert(studentSubscriptions).values({
          studentId: user.id,
          offerId: offer.id,
          status: "ACTIVE",
          startsAt: now,
          endsAt: offer.endsAt,
          activatedAt: now,
          createdByUserId: authorization.session.user.id,
          notes: "Created from academic administration.",
        });

        return { ...profile, fullName: user.fullName, phone: user.phone, status: user.status };
      });

      return NextResponse.json({ data: { record } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const pgCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (pgCode === "23505") return errorResponse(409, "DUPLICATE_STUDENT", "This phone or student code already exists.");
      console.error("admin.student.create.failed", { pgCode });
      return errorResponse(500, "STUDENT_CREATE_UNAVAILABLE", "Student creation is temporarily unavailable.");
    }
  }

  const id = action === "create" ? null : uuid(body.id);
  if (action !== "create" && !id) {
    return errorResponse(400, "INVALID_ID", "A valid record id is required.");
  }

  try {
    if (action === "delete") {
      switch (entity) {
        case "academicYear": await db.delete(academicYears).where(eq(academicYears.id, id!)); break;
        case "level": await db.delete(levels).where(eq(levels.id, id!)); break;
        case "stream": await db.delete(streams).where(eq(streams.id, id!)); break;
        case "group": await db.delete(groups).where(eq(groups.id, id!)); break;
        case "subject": await db.delete(subjects).where(eq(subjects.id, id!)); break;
      }
      return NextResponse.json({ data: { deleted: true } }, { headers: { "Cache-Control": "no-store" } });
    }

    if (entity === "academicYear") {
      const name = text(body.name, 80);
      const startsAt = date(body.startsAt);
      const endsAt = date(body.endsAt);
      if (!name || !startsAt || !endsAt || endsAt < startsAt) {
        return errorResponse(400, "INVALID_ACADEMIC_YEAR", "Name and a valid date range are required.");
      }
      const values = { name, startsAt, endsAt, active: body.active !== false, updatedAt: new Date() };
      const [record] = action === "create"
        ? await db.insert(academicYears).values(values).returning()
        : await db.update(academicYears).set(values).where(eq(academicYears.id, id!)).returning();
      return NextResponse.json({ data: { record } }, { status: action === "create" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    }

    if (entity === "level") {
      const name = text(body.name, 120);
      if (!name) return errorResponse(400, "INVALID_LEVEL", "Level name is required.");
      const values = { name, updatedAt: new Date() };
      const [record] = action === "create"
        ? await db.insert(levels).values(values).returning()
        : await db.update(levels).set(values).where(eq(levels.id, id!)).returning();
      return NextResponse.json({ data: { record } }, { status: action === "create" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    }

    if (entity === "stream") {
      const name = text(body.name, 120);
      const levelId = uuid(body.levelId);
      if (!name || !levelId) return errorResponse(400, "INVALID_STREAM", "Stream name and level are required.");
      const values = { name, levelId, updatedAt: new Date() };
      const [record] = action === "create"
        ? await db.insert(streams).values(values).returning()
        : await db.update(streams).set(values).where(eq(streams.id, id!)).returning();
      return NextResponse.json({ data: { record } }, { status: action === "create" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    }

    if (entity === "subject") {
      const name = text(body.name, 120);
      const slug = text(body.slug, 120);
      if (!name || !slug || !/^[a-z0-9-]+$/.test(slug)) {
        return errorResponse(400, "INVALID_SUBJECT", "Subject name and lowercase slug are required.");
      }
      const values = { name, slug, active: body.active !== false, updatedAt: new Date() };
      const [record] = action === "create"
        ? await db.insert(subjects).values(values).returning()
        : await db.update(subjects).set(values).where(eq(subjects.id, id!)).returning();
      return NextResponse.json({ data: { record } }, { status: action === "create" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
    }

    const name = text(body.name, 120);
    const academicYearId = uuid(body.academicYearId);
    const levelId = uuid(body.levelId);
    const streamId = optionalUuid(body.streamId);
    if (!name || !academicYearId || !levelId || streamId === undefined) {
      return errorResponse(400, "INVALID_GROUP", "Group name, academic year and level are required.");
    }
    const values = { name, academicYearId, levelId, streamId, active: body.active !== false, updatedAt: new Date() };
    const [record] = action === "create"
      ? await db.insert(groups).values(values).returning()
      : await db.update(groups).set(values).where(eq(groups.id, id!)).returning();
    return NextResponse.json({ data: { record } }, { status: action === "create" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const pgCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (pgCode === "23505") return errorResponse(409, "DUPLICATE_RECORD", "This academic record already exists.");
    if (pgCode === "23503") return errorResponse(409, "RECORD_IN_USE", "This record is referenced by other academic data.");
    console.error("admin.academic.operation.failed", { entity, action, pgCode });
    return errorResponse(500, "ACADEMIC_UNAVAILABLE", "Academic administration is temporarily unavailable.");
  }
}
