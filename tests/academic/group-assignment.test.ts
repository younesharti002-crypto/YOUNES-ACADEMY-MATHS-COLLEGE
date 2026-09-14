import test from "node:test";
import assert from "node:assert/strict";
import { validateGroupAssignment } from "../../src/lib/academic/group-assignment-core.ts";

const student = { levelId: "level-2bac", streamId: "stream-pc" };

test("accepts matching active group", () => {
  assert.deepEqual(
    validateGroupAssignment(student, { levelId: "level-2bac", streamId: "stream-pc", active: true }),
    { ok: true },
  );
});

test("accepts general group for same level", () => {
  assert.deepEqual(
    validateGroupAssignment(student, { levelId: "level-2bac", streamId: null, active: true }),
    { ok: true },
  );
});

test("rejects inactive group", () => {
  assert.deepEqual(
    validateGroupAssignment(student, { levelId: "level-2bac", streamId: "stream-pc", active: false }),
    { ok: false, reason: "GROUP_INACTIVE" },
  );
});

test("rejects level mismatch", () => {
  assert.deepEqual(
    validateGroupAssignment(student, { levelId: "level-1bac", streamId: "stream-pc", active: true }),
    { ok: false, reason: "LEVEL_MISMATCH" },
  );
});

test("rejects stream mismatch", () => {
  assert.deepEqual(
    validateGroupAssignment(student, { levelId: "level-2bac", streamId: "stream-sm", active: true }),
    { ok: false, reason: "STREAM_MISMATCH" },
  );
});
