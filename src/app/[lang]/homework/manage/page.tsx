import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HomeworkManagerClient } from "@/components/homework/HomeworkManagerClient";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function HomeworkManagePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token
    ? await getAuthenticatedSession(token).catch(() => null)
    : null;

  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect(`/${lang}/login`);
  }

  return (
    <HomeworkManagerClient
      locale={lang}
      role={session.user.role as "ADMIN" | "TEACHER"}
      staffName={session.user.fullName}
    />
  );
}
