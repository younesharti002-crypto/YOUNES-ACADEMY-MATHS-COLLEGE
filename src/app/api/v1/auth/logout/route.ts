import { NextRequest, NextResponse } from "next/server";
import {
  deleteSessionByToken,
  getClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  try {
    if (token) {
      await deleteSessionByToken(token);
    }

    const response = NextResponse.json(
      {
        data: { loggedOut: true },
        meta: {},
      },
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getClearedSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("auth.logout.failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Logout is temporarily unavailable.",
        },
      },
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }
}
