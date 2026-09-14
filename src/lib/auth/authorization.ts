import type { NextRequest } from "next/server";
import {
  getAuthenticatedSession,
  SESSION_COOKIE_NAME,
  type AuthenticatedSession,
} from "@/lib/auth/session";
import { isRoleAllowed, type AuthRole } from "@/lib/auth/roles";

export type UserRole = AuthenticatedSession["user"]["role"];

export type AuthorizationResult =
  | { ok: true; session: AuthenticatedSession }
  | { ok: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" };

export async function authorizeRequest(
  request: NextRequest,
  allowedRoles?: readonly UserRole[],
): Promise<AuthorizationResult> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  const session = await getAuthenticatedSession(token);

  if (!session) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  if (!isRoleAllowed(session.user.role as AuthRole, allowedRoles)) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  return { ok: true, session };
}
