import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, users } from "@/db/schema";

export const SESSION_COOKIE_NAME = "younes_academy_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type CreatedSession = {
  token: string;
  expiresAt: Date;
};

export type AuthenticatedSession = {
  sessionId: string;
  expiresAt: Date;
  user: {
    id: string;
    fullName: string;
    phone: string;
    role: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
    preferredLanguage: "ar" | "fr";
  };
};

export async function createSessionForUser(
  userId: string,
): Promise<CreatedSession> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getAuthenticatedSession(
  token: string,
): Promise<AuthenticatedSession | null> {
  if (!token || token.length > 256) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      userId: users.id,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      status: users.status,
      preferredLanguage: users.preferredLanguage,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        gt(authSessions.expiresAt, now),
        eq(users.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: now })
    .where(eq(authSessions.id, row.sessionId));

  return {
    sessionId: row.sessionId,
    expiresAt: row.expiresAt,
    user: {
      id: row.userId,
      fullName: row.fullName,
      phone: row.phone,
      role: row.role,
      status: row.status,
      preferredLanguage: row.preferredLanguage,
    },
  };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  if (!token || token.length > 256) {
    return;
  }

  const tokenHash = hashSessionToken(token);
  await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function getClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}
