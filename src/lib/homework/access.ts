import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { academyAssignments } from "@/db/academy-operations-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import { studentProfiles } from "@/db/schema";
import type { AuthenticatedSession } from "@/lib/auth/session";

export async function teacherCanAccessGroup(userId: string, groupId: string) {
  const [row] = await db
    .select({ id: academyWeeklySessions.id })
    .from(academyWeeklySessions)
    .where(
      and(
        eq(academyWeeklySessions.groupId, groupId),
        eq(academyWeeklySessions.teacherUserId, userId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function getAccessibleAssignment(
  session: AuthenticatedSession,
  assignmentId: string,
) {
  const [assignment] = await db
    .select()
    .from(academyAssignments)
    .where(eq(academyAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) return null;

  if (session.user.role === "ADMIN") return assignment;

  if (session.user.role === "TEACHER") {
    if (assignment.teacherUserId === session.user.id) return assignment;
    return (await teacherCanAccessGroup(session.user.id, assignment.groupId))
      ? assignment
      : null;
  }

  if (session.user.role === "STUDENT") {
    const [profile] = await db
      .select({
        id: studentProfiles.id,
        groupId: studentProfiles.primaryGroupId,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1);

    return profile?.groupId === assignment.groupId && assignment.published
      ? assignment
      : null;
  }

  return null;
}
