import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  parentProfiles,
  parentStudents,
  studentProfiles,
  teacherProfiles,
  users,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { normalizeMoroccanPhone } from "@/lib/auth/phone";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function text(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
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
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Admin access required.",
    );
  }

  const [parents, teachers, students, links] = await Promise.all([
    db
      .select({
        profileId: parentProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        preferredLanguage: users.preferredLanguage,
      })
      .from(parentProfiles)
      .innerJoin(users, eq(parentProfiles.userId, users.id))
      .orderBy(asc(users.fullName)),
    db
      .select({
        profileId: teacherProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        preferredLanguage: users.preferredLanguage,
        bio: teacherProfiles.bio,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(teacherProfiles.userId, users.id))
      .orderBy(asc(users.fullName)),
    db
      .select({
        profileId: studentProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        studentCode: studentProfiles.studentCode,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .orderBy(asc(users.fullName)),
    db
      .select({
        parentId: parentStudents.parentId,
        studentId: parentStudents.studentId,
        relationship: parentStudents.relationship,
      })
      .from(parentStudents),
  ]);

  return NextResponse.json(
    { data: { parents, teachers, students, links } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Admin access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "createTeacher" || action === "createParent") {
    const fullName = text(body.fullName, 160);
    const phone =
      typeof body.phone === "string" ? normalizeMoroccanPhone(body.phone) : null;
    const password = typeof body.password === "string" ? body.password : "";
    const preferredLanguage = body.preferredLanguage === "fr" ? "fr" : "ar";
    const bio = text(body.bio, 1000);

    if (!fullName || !phone || password.length < 8 || password.length > 128) {
      return errorResponse(
        400,
        "INVALID_ACCOUNT",
        "Name, Moroccan phone and a password of at least 8 characters are required.",
      );
    }

    try {
      const passwordHash = await hashPassword(password);
      const role = action === "createTeacher" ? "TEACHER" : "PARENT";

      const record = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            fullName,
            phone,
            passwordHash,
            role,
            status: "ACTIVE",
            preferredLanguage,
          })
          .returning({
            id: users.id,
            fullName: users.fullName,
            phone: users.phone,
            status: users.status,
            preferredLanguage: users.preferredLanguage,
          });

        if (action === "createTeacher") {
          const [profile] = await tx
            .insert(teacherProfiles)
            .values({ userId: user.id, bio })
            .returning({ profileId: teacherProfiles.id });
          return { ...user, ...profile, role };
        }

        const [profile] = await tx
          .insert(parentProfiles)
          .values({ userId: user.id })
          .returning({ profileId: parentProfiles.id });
        return { ...user, ...profile, role };
      });

      return NextResponse.json(
        { data: { record } },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const pgCode =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (pgCode === "23505") {
        return errorResponse(
          409,
          "DUPLICATE_ACCOUNT",
          "An account with this phone already exists.",
        );
      }
      console.error("admin.people.create.failed", { action, pgCode });
      return errorResponse(
        500,
        "ACCOUNT_CREATE_UNAVAILABLE",
        "Account creation is temporarily unavailable.",
      );
    }
  }

  if (action === "linkParentStudent") {
    const parentId = uuid(body.parentId);
    const studentId = uuid(body.studentId);
    const relationship = text(body.relationship, 80);

    if (!parentId || !studentId) {
      return errorResponse(
        400,
        "INVALID_LINK",
        "A valid parent and student are required.",
      );
    }

    const [[parent], [student]] = await Promise.all([
      db
        .select({ id: parentProfiles.id })
        .from(parentProfiles)
        .where(eq(parentProfiles.id, parentId))
        .limit(1),
      db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentId))
        .limit(1),
    ]);

    if (!parent || !student) {
      return errorResponse(
        404,
        "PROFILE_NOT_FOUND",
        "Parent or student profile not found.",
      );
    }

    await db
      .insert(parentStudents)
      .values({ parentId, studentId, relationship })
      .onConflictDoUpdate({
        target: [parentStudents.parentId, parentStudents.studentId],
        set: { relationship },
      });

    return NextResponse.json(
      { data: { linked: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (action === "unlinkParentStudent") {
    const parentId = uuid(body.parentId);
    const studentId = uuid(body.studentId);

    if (!parentId || !studentId) {
      return errorResponse(
        400,
        "INVALID_LINK",
        "A valid parent and student are required.",
      );
    }

    await db
      .delete(parentStudents)
      .where(
        and(
          eq(parentStudents.parentId, parentId),
          eq(parentStudents.studentId, studentId),
        ),
      );

    return NextResponse.json(
      { data: { linked: false } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (action === "setUserStatus") {
    const userId = uuid(body.userId);
    const status =
      body.status === "ACTIVE"
        ? "ACTIVE"
        : body.status === "DISABLED"
          ? "DISABLED"
          : null;

    if (!userId || !status) {
      return errorResponse(
        400,
        "INVALID_STATUS",
        "A valid user and status are required.",
      );
    }

    if (userId === authorization.session.user.id && status === "DISABLED") {
      return errorResponse(
        409,
        "SELF_DISABLE_FORBIDDEN",
        "You cannot disable your own admin account.",
      );
    }

    const [record] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, status: users.status });

    if (!record) {
      return errorResponse(404, "USER_NOT_FOUND", "User not found.");
    }

    return NextResponse.json(
      { data: { record } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return errorResponse(400, "INVALID_ACTION", "Unsupported people operation.");
}
