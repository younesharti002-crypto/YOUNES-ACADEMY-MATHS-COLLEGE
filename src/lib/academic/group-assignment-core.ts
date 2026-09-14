export type StudentAcademicScope = {
  levelId: string;
  streamId: string | null;
};

export type GroupAcademicScope = {
  levelId: string;
  streamId: string | null;
  active: boolean;
};

export type GroupAssignmentValidation =
  | { ok: true }
  | {
      ok: false;
      reason: "GROUP_INACTIVE" | "LEVEL_MISMATCH" | "STREAM_MISMATCH";
    };

export function validateGroupAssignment(
  student: StudentAcademicScope,
  group: GroupAcademicScope,
): GroupAssignmentValidation {
  if (!group.active) {
    return { ok: false, reason: "GROUP_INACTIVE" };
  }

  if (student.levelId !== group.levelId) {
    return { ok: false, reason: "LEVEL_MISMATCH" };
  }

  if (group.streamId !== null && student.streamId !== group.streamId) {
    return { ok: false, reason: "STREAM_MISMATCH" };
  }

  return { ok: true };
}
