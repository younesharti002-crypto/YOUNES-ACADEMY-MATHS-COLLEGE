import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMoroccanPhone } from "../../src/lib/auth/phone.ts";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password.ts";
import { isRoleAllowed } from "../../src/lib/auth/roles.ts";

test("normalizes supported Moroccan phone formats", () => {
  assert.equal(normalizeMoroccanPhone("0612345678"), "+212612345678");
  assert.equal(normalizeMoroccanPhone("06 12 34 56 78"), "+212612345678");
  assert.equal(normalizeMoroccanPhone("+212612345678"), "+212612345678");
  assert.equal(normalizeMoroccanPhone("00212612345678"), "+212612345678");
});

test("rejects malformed or unsupported phone values", () => {
  assert.equal(normalizeMoroccanPhone(""), null);
  assert.equal(normalizeMoroccanPhone("+33123456789"), null);
  assert.equal(normalizeMoroccanPhone("abc"), null);
});

test("password hashes verify only the correct password", async () => {
  const hash = await hashPassword("Strong-Test-Password-2026!");
  assert.equal(await verifyPassword("Strong-Test-Password-2026!", hash), true);
  assert.equal(await verifyPassword("Wrong-Password", hash), false);
  assert.equal(await verifyPassword("Strong-Test-Password-2026!", "invalid"), false);
});

test("role helper permits only configured roles", () => {
  assert.equal(isRoleAllowed("STUDENT"), true);
  assert.equal(isRoleAllowed("ADMIN", ["ADMIN"]), true);
  assert.equal(isRoleAllowed("STUDENT", ["ADMIN", "TEACHER"]), false);
});
