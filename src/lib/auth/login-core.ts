export type LoginUserRole = "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";
export type LoginUserStatus = "ACTIVE" | "DISABLED";
export type LoginPreferredLanguage = "ar" | "fr";

export type LoginCredentialUser = {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: LoginUserRole;
  status: LoginUserStatus;
  preferredLanguage: LoginPreferredLanguage;
};

export type SafeLoginUser = Omit<LoginCredentialUser, "passwordHash">;

export type LoginResult =
  | { ok: true; user: SafeLoginUser }
  | {
      ok: false;
      reason: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED";
    };

export type LoginCoreDependencies = {
  normalizePhone: (input: string) => string | null;
  findUserByPhone: (phone: string) => Promise<LoginCredentialUser | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  touchUserLogin: (userId: string, at: Date) => Promise<void>;
  now?: () => Date;
};

export async function authenticateLoginCore(
  phoneInput: string,
  password: string,
  dependencies: LoginCoreDependencies,
): Promise<LoginResult> {
  const phone = dependencies.normalizePhone(phoneInput);

  if (!phone || typeof password !== "string" || password.length === 0) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const user = await dependencies.findUserByPhone(phone);

  if (!user) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const passwordMatches = await dependencies.verifyPassword(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (user.status !== "ACTIVE") {
    return { ok: false, reason: "ACCOUNT_DISABLED" };
  }

  const now = dependencies.now?.() ?? new Date();
  await dependencies.touchUserLogin(user.id, now);

  const { passwordHash: _passwordHash, ...safeUser } = user;
  void _passwordHash;

  return { ok: true, user: safeUser };
}
