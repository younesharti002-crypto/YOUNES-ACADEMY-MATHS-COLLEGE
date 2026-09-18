import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HomeworkClient } from "@/components/homework/HomeworkClient";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function HomeworkPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session) redirect(`/${lang}/login`);
  if (!["ADMIN", "TEACHER", "STUDENT"].includes(session.user.role)) {
    redirect(`/${lang}/parent`);
  }

  return (
    <HomeworkClient
      locale={lang}
      role={session.user.role as "ADMIN" | "TEACHER" | "STUDENT"}
    />
  );
}
