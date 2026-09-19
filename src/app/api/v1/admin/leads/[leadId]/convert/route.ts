import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { registrationLeads } from "@/db/lead-schema";
import {
  levels,
  parentProfiles,
  parentStudents,
  studentProfiles,
  streams,
  users,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { normalizeMoroccanPhone } from "@/lib/auth/phone";
import { ensureLeadsSchema } from "@/lib/leads/ensure-leads-schema";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ leadId: string }> };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function cleanText(value: unknown, max = 160) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseLevel(raw: string) {
  const value = raw.trim().toUpperCase();
  if (value.startsWith("2BAC")) {
    const streamName = value.replace("2BAC", "").trim() || null;
    return { levelName: "2BAC", streamName };
  }

  return { levelName: value, streamName: null };
}

function generatePassword() {
  return `TSA-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function generateStudentCode(levelName: string) {
  const safeLevel = levelName.replace(/[^A-Z0-9]/g, "");
  const suffix = Date.now().toString(36).toUpperCase();
  return `TSA-${safeLevel}-${suffix}`;
}

async function findOrCreateLevel(levelName: string) {
  const [existing] = await db
    .select({ id: levels.id, name: levels.name })
    .from(levels)
    .where(eq(levels.name, levelName))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(levels)
    .values({ name: levelName })
    .returning({ id: levels.id, name: levels.name });

  return created;
}

async function findOrCreateStream(levelId: string, streamName: string | null) {
  if (!streamName) return null;

  const [existing] = await db
    .select({ id: streams.id, name: streams.name })
    .from(streams)
    .where(and(eq(streams.levelId, levelId), eq(streams.name, streamName)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(streams)
    .values({ levelId, name: streamName })
    .returning({ id: streams.id, name: streams.name });

  return created;
}

export async function POST(request: NextRequest, { params }: Params) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Admin access required.",
    );
  }

  const { leadId } = await params;
  if (!UUID_PATTERN.test(leadId)) {
    return errorResponse(400, "INVALID_LEAD", "Invalid lead id.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  await ensureLeadsSchema();

  const [lead] = await db
    .select()
    .from(registrationLeads)
    .where(eq(registrationLeads.id, leadId))
    .limit(1);

  if (!lead) {
    return errorResponse(404, "LEAD_NOT_FOUND", "Lead not found.");
  }

  if (lead.status === "REGISTERED") {
    return errorResponse(409, "LEAD_ALREADY_REGISTERED", "This lead is already registered.");
  }

  const studentName = cleanText(body.studentName, 160) || lead.fullName;
  const parentName = cleanText(body.parentName, 160) || `Parent ${lead.fullName}`;
  const studentPhone = normalizeMoroccanPhone(cleanText(body.studentPhone, 32));
  const parentPhone = normalizeMoroccanPhone(cleanText(body.parentPhone, 32) || lead.phone);
  const preferredLanguage = body.preferredLanguage === "fr" ? "fr" : "ar";
  const tempPassword = cleanText(body.password, 128) || generatePassword();

  if (!studentName || !parentName || !studentPhone || !parentPhone) {
    return errorResponse(
      400,
      "MISSING_REQUIRED_FIELDS",
      "Student name, student phone, parent name and parent phone are required.",
    );
  }

  if (studentPhone === parentPhone) {
    return errorResponse(
      400,
      "PHONE_CONFLICT",
      "Student phone must be different from parent phone.",
    );
  }

  if (tempPassword.length < 8 || tempPassword.length > 128) {
    return errorResponse(
      400,
      "INVALID_PASSWORD",
      "Temporary password must contain at least 8 characters.",
    );
  }

  const { levelName, streamName } = parseLevel(lead.level);
  const passwordHash = await hashPassword(tempPassword);
  const studentCode = generateStudentCode(levelName);

  try {
    const result = await db.transaction(async (tx) => {
      const level = await findOrCreateLevel(levelName);
      const stream = await findOrCreateStream(level.id, streamName);

      const [studentUser] = await tx
        .insert(users)
        .values({
          fullName: studentName,
          phone: studentPhone,
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          preferredLanguage,
        })
        .returning({ id: users.id, fullName: users.fullName, phone: users.phone });

      const [studentProfile] = await tx
        .insert(studentProfiles)
        .values({
          userId: studentUser.id,
          levelId: level.id,
          streamId: stream?.id ?? null,
          studentCode,
        })
        .returning({ id: studentProfiles.id, studentCode: studentProfiles.studentCode });

      const [existingParentUser] = await tx
        .select({ id: users.id, fullName: users.fullName, phone: users.phone })
        .from(users)
        .where(eq(users.phone, parentPhone))
        .limit(1);

      const parentUser = existingParentUser
        ? existingParentUser
        : (
            await tx
              .insert(users)
              .values({
                fullName: parentName,
                phone: parentPhone,
                passwordHash,
                role: "PARENT",
                status: "ACTIVE",
                preferredLanguage,
              })
              .returning({ id: users.id, fullName: users.fullName, phone: users.phone })
          )[0];

      const [existingParentProfile] = await tx
        .select({ id: parentProfiles.id })
        .from(parentProfiles)
        .where(eq(parentProfiles.userId, parentUser.id))
        .limit(1);

      const parentProfile = existingParentProfile
        ? existingParentProfile
        : (
            await tx
              .insert(parentProfiles)
              .values({ userId: parentUser.id })
              .returning({ id: parentProfiles.id })
          )[0];

      await tx
        .insert(parentStudents)
        .values({
          parentId: parentProfile.id,
          studentId: studentProfile.id,
          relationship: "parent",
        })
        .onConflictDoUpdate({
          target: [parentStudents.parentId, parentStudents.studentId],
          set: { relationship: "parent" },
        });

      await tx
        .update(registrationLeads)
        .set({ status: "REGISTERED", updatedAt: new Date() })
        .where(eq(registrationLeads.id, lead.id));

      return { studentUser, studentProfile, parentUser, parentProfile, level, stream };
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...result,
          tempPassword,
        },
      },
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
        "DUPLICATE_PHONE_OR_CODE",
        "A user with one of these phone numbers already exists, or the student code already exists.",
      );
    }

    console.error("lead_convert_failed", { leadId, pgCode, error });
    return errorResponse(500, "CONVERT_FAILED", "Lead conversion failed.");
  }
}
