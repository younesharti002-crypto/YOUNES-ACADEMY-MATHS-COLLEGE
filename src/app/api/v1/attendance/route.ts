import { and, asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { academyAttendance } from "@/db/academy-operations-schema";
import { academyRooms, academyWeeklySessions } from "@/db/academy-management-schema";
import { groups, studentProfiles, subjects, users } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type AttendanceStatus = (typeof STATUSES)[number];

const DAY_FROM_UTC: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

function dateDay(value: string): string | null {
  const date = new Date(`${value}T12:00:00Z`);
  return DAY_FROM_UTC[date.getUTCDay()] ?? null;
}

function attendanceStatus(value: unknown): AttendanceStatus | null {
  return typeof value === "string" &&
    (STATUSES as readonly string[]).includes(value)
    ? (value as AttendanceStatus)
    : null;
}

async function requireStaff(request: NextRequest) {
  return authorizeRequest(request, ["ADMIN", "TEACHER"]);
}

async function findAccessibleSession(
  sessionId: string,
  userId: string,
  role: "ADMIN" | "TEACHER",
) {
  const rows = await db
    .select({
      id: academyWeeklySessions.id,
      groupId: academyWeeklySessions.groupId,
      teacherUserId: academyWeeklySessions.teacherUserId,
      day: academyWeeklySessions.day,
      groupName: groups.name,
      subjectName: subjects.name,
      roomName: academyRooms.name,
      startsAt: academyWeeklySessions.startsAt,
      endsAt: academyWeeklySessions.endsAt,
    })
    .from(academyWeeklySessions)
    .innerJoin(groups, eq(academyWeeklySessions.groupId, groups.id))
    .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
    .innerJoin(academyRooms, eq(academyWeeklySessions.roomId, academyRooms.id))
    .where(eq(academyWeeklySessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (role === "TEACHER" && row.teacherUserId !== userId) return null;
  return row;
}

export async function GET(request: NextRequest) {
  const authorization = await requireStaff(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Staff access required.",
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = uuid(searchParams.get("weeklySessionId"));
  const sessionDate = validDate(searchParams.get("date"));

  if (!sessionId && !searchParams.has("weeklySessionId")) {
    const base = db
      .select({
        id: academyWeeklySessions.id,
        groupId: academyWeeklySessions.groupId,
        teacherUserId: academyWeeklySessions.teacherUserId,
        day: academyWeeklySessions.day,
        startsAt: academyWeeklySessions.startsAt,
        endsAt: academyWeeklySessions.endsAt,
        groupName: groups.name,
        subjectName: subjects.name,
        roomName: academyRooms.name,
      })
      .from(academyWeeklySessions)
      .innerJoin(groups, eq(academyWeeklySessions.groupId, groups.id))
      .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
      .innerJoin(academyRooms, eq(academyWeeklySessions.roomId, academyRooms.id));

    const sessions =
      authorization.session.user.role === "ADMIN"
        ? await base.orderBy(
            asc(academyWeeklySessions.startsAt),
            asc(groups.name),
          )
        : await base
            .where(
              eq(
                academyWeeklySessions.teacherUserId,
                authorization.session.user.id,
              ),
            )
            .orderBy(
              asc(academyWeeklySessions.startsAt),
              asc(groups.name),
            );

    return NextResponse.json(
      { data: { sessions } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!sessionId || !sessionDate) {
    return errorResponse(
      400,
      "INVALID_ATTENDANCE_QUERY",
      "A valid weeklySessionId and date are required.",
    );
  }

  const session = await findAccessibleSession(
    sessionId,
    authorization.session.user.id,
    authorization.session.user.role as "ADMIN" | "TEACHER",
  );

  if (!session) {
    return errorResponse(
      404,
      "SESSION_NOT_FOUND",
      "Session not found or not assigned to this teacher.",
    );
  }

  if (dateDay(sessionDate) !== session.day) {
    return errorResponse(
      409,
      "WRONG_SESSION_DAY",
      "The selected date does not match the weekly session day.",
    );
  }

  const [students, records] = await Promise.all([
    db
      .select({
        profileId: studentProfiles.id,
        fullName: users.fullName,
        studentCode: studentProfiles.studentCode,
        phone: users.phone,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(studentProfiles.primaryGroupId, session.groupId),
          eq(users.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(users.fullName)),
    db
      .select({
        id: academyAttendance.id,
        studentProfileId: academyAttendance.studentProfileId,
        status: academyAttendance.status,
        note: academyAttendance.note,
        markedAt: academyAttendance.markedAt,
      })
      .from(academyAttendance)
      .where(
        and(
          eq(academyAttendance.weeklySessionId, sessionId),
          eq(academyAttendance.sessionDate, sessionDate),
        ),
      ),
  ]);

  return NextResponse.json(
    { data: { session, students, records } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await requireStaff(request);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Staff access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const sessionId = uuid(body.weeklySessionId);
  const sessionDate = validDate(body.date);
  const rawRecords = Array.isArray(body.records) ? body.records : null;

  if (!sessionId || !sessionDate || !rawRecords || rawRecords.length > 100) {
    return errorResponse(
      400,
      "INVALID_ATTENDANCE",
      "Session, date and attendance records are required.",
    );
  }

  const session = await findAccessibleSession(
    sessionId,
    authorization.session.user.id,
    authorization.session.user.role as "ADMIN" | "TEACHER",
  );

  if (!session) {
    return errorResponse(
      404,
      "SESSION_NOT_FOUND",
      "Session not found or not assigned to this teacher.",
    );
  }

  if (dateDay(sessionDate) !== session.day) {
    return errorResponse(
      409,
      "WRONG_SESSION_DAY",
      "The selected date does not match the weekly session day.",
    );
  }

  const parsedRecords = rawRecords
    .map((value) => {
      if (typeof value !== "object" || value === null) return null;
      const record = value as Record<string, unknown>;
      const studentProfileId = uuid(record.studentProfileId);
      const status = attendanceStatus(record.status);
      const note =
        typeof record.note === "string" && record.note.trim().length <= 500
          ? record.note.trim() || null
          : null;
      return studentProfileId && status
        ? { studentProfileId, status, note }
        : null;
    })
    .filter(
      (
        value,
      ): value is {
        studentProfileId: string;
        status: AttendanceStatus;
        note: string | null;
      } => value !== null,
    );

  if (parsedRecords.length !== rawRecords.length) {
    return errorResponse(
      400,
      "INVALID_ATTENDANCE_RECORD",
      "One or more attendance records are invalid.",
    );
  }

  const uniqueStudentIds = [...new Set(parsedRecords.map((row) => row.studentProfileId))];
  if (uniqueStudentIds.length !== parsedRecords.length) {
    return errorResponse(
      400,
      "DUPLICATE_STUDENT",
      "A student can only appear once per attendance submission.",
    );
  }

  if (uniqueStudentIds.length > 0) {
    const groupStudents = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.primaryGroupId, session.groupId),
          inArray(studentProfiles.id, uniqueStudentIds),
        ),
      );

    if (groupStudents.length !== uniqueStudentIds.length) {
      return errorResponse(
        409,
        "STUDENT_GROUP_MISMATCH",
        "One or more students do not belong to this group.",
      );
    }
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const record of parsedRecords) {
      await tx
        .insert(academyAttendance)
        .values({
          weeklySessionId: sessionId,
          studentProfileId: record.studentProfileId,
          sessionDate,
          status: record.status,
          note: record.note,
          markedByUserId: authorization.session.user.id,
          markedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            academyAttendance.weeklySessionId,
            academyAttendance.studentProfileId,
            academyAttendance.sessionDate,
          ],
          set: {
            status: record.status,
            note: record.note,
            markedByUserId: authorization.session.user.id,
            markedAt: now,
            updatedAt: now,
          },
        });
    }
  });

  return NextResponse.json(
    { data: { saved: parsedRecords.length } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
