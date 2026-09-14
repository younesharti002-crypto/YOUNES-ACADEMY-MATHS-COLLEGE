export type AuthRole = "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";

export function isRoleAllowed(
  role: AuthRole,
  allowedRoles?: readonly AuthRole[],
): boolean {
  return !allowedRoles || allowedRoles.includes(role);
}
