import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/authorization";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await authorizeRequest(request);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            code: result.reason,
            message:
              result.reason === "FORBIDDEN"
                ? "You are not allowed to access this resource."
                : "Authentication is required.",
          },
        },
        {
          status: result.reason === "FORBIDDEN" ? 403 : 401,
          headers: JSON_HEADERS,
        },
      );
    }

    return NextResponse.json(
      {
        data: {
          user: result.session.user,
          session: {
            expiresAt: result.session.expiresAt.toISOString(),
          },
        },
        meta: {},
      },
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    );
  } catch (error) {
    console.error("auth.me.failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Authentication is temporarily unavailable.",
        },
      },
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }
}
