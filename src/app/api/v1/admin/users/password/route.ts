import { asc, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { authSessions, users } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);

  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Administrator access required.",
    );
  }

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(ne(users.role, "ADMIN"))
    .orderBy(asc(users.role), asc(users.fullName));

  return NextResponse.json(
    { data: { users: rows } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);

  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Administrator access required.",
    );
  }

  let body: { userId?: unknown; newPassword?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body.");
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!userId || newPassword.length < 8 || newPassword.length > 128) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Select a user and use a password between 8 and 128 characters.",
    );
  }

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return errorResponse(404, "USER_NOT_FOUND", "User not found.");
  }

  if (target.role === "ADMIN") {
    return errorResponse(
      403,
      "ADMIN_PASSWORD_RESET_BLOCKED",
      "Administrator passwords cannot be reset from this screen.",
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, target.id));

    await tx.delete(authSessions).where(eq(authSessions.userId, target.id));
  });

  return NextResponse.json(
    {
      data: {
        user: {
          id: target.id,
          fullName: target.fullName,
          role: target.role,
        },
        sessionsRevoked: true,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
