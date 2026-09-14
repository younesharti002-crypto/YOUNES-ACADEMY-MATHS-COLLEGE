import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateLoginCore,
  type LoginCoreDependencies,
  type LoginCredentialUser,
} from "../../src/lib/auth/login-core.ts";

const activeUser: LoginCredentialUser = {
  id: "11111111-1111-1111-1111-111111111111",
  fullName: "Test Student",
  phone: "+212612345678",
  passwordHash: "hash",
  role: "STUDENT",
  status: "ACTIVE",
  preferredLanguage: "ar",
};

function makeDependencies(overrides: Partial<LoginCoreDependencies> = {}): LoginCoreDependencies {
  return {
    normalizePhone: (input) => (input === "valid" ? activeUser.phone : null),
    findUserByPhone: async () => activeUser,
    verifyPassword: async (password) => password === "correct",
    touchUserLogin: async () => undefined,
    now: () => new Date("2026-08-21T00:00:00.000Z"),
    ...overrides,
  };
}

test("rejects malformed phone input", async () => {
  const result = await authenticateLoginCore("bad", "correct", makeDependencies());
  assert.deepEqual(result, { ok: false, reason: "INVALID_INPUT" });
});

test("rejects unknown user", async () => {
  const result = await authenticateLoginCore(
    "valid",
    "correct",
    makeDependencies({ findUserByPhone: async () => null }),
  );
  assert.deepEqual(result, { ok: false, reason: "INVALID_CREDENTIALS" });
});

test("rejects wrong password", async () => {
  const result = await authenticateLoginCore("valid", "wrong", makeDependencies());
  assert.deepEqual(result, { ok: false, reason: "INVALID_CREDENTIALS" });
});

test("rejects disabled account after valid credentials", async () => {
  const disabledUser = { ...activeUser, status: "DISABLED" as const };
  const result = await authenticateLoginCore(
    "valid",
    "correct",
    makeDependencies({ findUserByPhone: async () => disabledUser }),
  );
  assert.deepEqual(result, { ok: false, reason: "ACCOUNT_DISABLED" });
});

test("returns safe user and records successful login", async () => {
  let touched: { userId: string; at: Date } | null = null;
  const expectedTime = new Date("2026-08-21T00:00:00.000Z");
  const result = await authenticateLoginCore(
    "valid",
    "correct",
    makeDependencies({
      touchUserLogin: async (userId, at) => {
        touched = { userId, at };
      },
      now: () => expectedTime,
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal("passwordHash" in result.user, false);
  assert.equal(result.user.id, activeUser.id);
  assert.deepEqual(touched, { userId: activeUser.id, at: expectedTime });
});
