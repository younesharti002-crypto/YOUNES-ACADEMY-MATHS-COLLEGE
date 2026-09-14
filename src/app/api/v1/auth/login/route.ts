import { NextResponse } from "next/server";
import { authenticateWithPhoneAndPassword } from "@/lib/auth/login";
import {
  createSessionForUser,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

type LoginBody = {
  phone?: unknown;
  password?: unknown;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: JSON_HEADERS,
    },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  if (typeof body.phone !== "string" || typeof body.password !== "string") {
    return errorResponse(400, "INVALID_REQUEST", "Phone and password are required.");
  }

  try {
    const result = await authenticateWithPhoneAndPassword(
      body.phone,
      body.password,
    );

    if (!result.ok) {
      if (result.reason === "ACCOUNT_DISABLED") {
        return errorResponse(403, "ACCOUNT_DISABLED", "This account is disabled.");
      }

      if (result.reason === "INVALID_INPUT") {
        return errorResponse(400, "INVALID_REQUEST", "Invalid phone or password format.");
      }

      return errorResponse(401, "INVALID_CREDENTIALS", "Invalid phone or password.");
    }

    const session = await createSessionForUser(result.user.id);

    const response = NextResponse.json(
      {
        data: {
          user: result.user,
          session: {
            expiresAt: session.expiresAt.toISOString(),
          },
        },
        meta: {},
      },
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.token,
      getSessionCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    console.error("auth.login.failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return errorResponse(500, "AUTH_UNAVAILABLE", "Login is temporarily unavailable.");
  }
}
