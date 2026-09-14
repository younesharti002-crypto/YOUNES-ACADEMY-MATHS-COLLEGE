import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeMoroccanPhone } from "@/lib/auth/phone";
import { verifyPassword } from "@/lib/auth/password";
import {
  authenticateLoginCore,
  type LoginCredentialUser,
  type LoginResult,
  type SafeLoginUser,
} from "@/lib/auth/login-core";

export type { LoginResult, SafeLoginUser } from "@/lib/auth/login-core";

async function findUserByPhone(phone: string): Promise<LoginCredentialUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      passwordHash: users.passwordHash,
      role: users.role,
      status: users.status,
      preferredLanguage: users.preferredLanguage,
    })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  return user ?? null;
}

async function touchUserLogin(userId: string, at: Date): Promise<void> {
  await db
    .update(users)
    .set({
      lastLoginAt: at,
      updatedAt: at,
    })
    .where(eq(users.id, userId));
}

export async function authenticateWithPhoneAndPassword(
  phoneInput: string,
  password: string,
): Promise<LoginResult> {
  return authenticateLoginCore(phoneInput, password, {
    normalizePhone: normalizeMoroccanPhone,
    findUserByPhone,
    verifyPassword,
    touchUserLogin,
  });
}
