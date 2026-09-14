import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, studentProfiles } from "@/db/schema";
import { validateGroupAssignment } from "@/lib/academic/group-assignment-core";

export async function assignStudentPrimaryGroup(
  studentProfileId: string,
  groupId: string | null,
) {
  const [student] = await db
    .select({
      id: studentProfiles.id,
      levelId: studentProfiles.levelId,
      streamId: studentProfiles.streamId,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  if (!student) {
    throw new Error("STUDENT_PROFILE_NOT_FOUND");
  }

  if (groupId === null) {
    const [updated] = await db
      .update(studentProfiles)
      .set({ primaryGroupId: null, updatedAt: new Date() })
      .where(eq(studentProfiles.id, studentProfileId))
      .returning();
    return updated;
  }

  const [group] = await db
    .select({
      id: groups.id,
      levelId: groups.levelId,
      streamId: groups.streamId,
      active: groups.active,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const validation = validateGroupAssignment(student, group);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const [updated] = await db
    .update(studentProfiles)
    .set({ primaryGroupId: group.id, updatedAt: new Date() })
    .where(eq(studentProfiles.id, studentProfileId))
    .returning();

  return updated;
}
