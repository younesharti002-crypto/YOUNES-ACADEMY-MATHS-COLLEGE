import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/authorization";
import { assignStudentPrimaryGroup } from "@/lib/academic/group-assignment";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ studentProfileId: string }> },
) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Admin access required.",
    );
  }

  const { studentProfileId } = await context.params;
  if (!UUID_PATTERN.test(studentProfileId)) {
    return errorResponse(400, "INVALID_STUDENT_PROFILE_ID", "A valid student profile id is required.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const groupId = body.groupId === null || body.groupId === "" ? null : body.groupId;
  if (groupId !== null && (typeof groupId !== "string" || !UUID_PATTERN.test(groupId))) {
    return errorResponse(400, "INVALID_GROUP_ID", "A valid group id or null is required.");
  }

  try {
    const profile = await assignStudentPrimaryGroup(studentProfileId, groupId);
    return NextResponse.json(
      { data: { profile } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "STUDENT_PROFILE_NOT_FOUND" || code === "GROUP_NOT_FOUND") {
      return errorResponse(404, code, code === "GROUP_NOT_FOUND" ? "Group not found." : "Student profile not found.");
    }
    if (["GROUP_INACTIVE", "LEVEL_MISMATCH", "STREAM_MISMATCH"].includes(code)) {
      return errorResponse(409, code, "The selected group is not compatible with this student profile.");
    }
    console.error("admin.student.group.failed", { code });
    return errorResponse(500, "GROUP_ASSIGNMENT_UNAVAILABLE", "Group assignment is temporarily unavailable.");
  }
}
