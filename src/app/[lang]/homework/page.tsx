import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { StudentHomeworkClient } from "@/components/homework/StudentHomeworkClient";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function StudentHomeworkPage({
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

  if (!session || session.user.role !== "STUDENT") {
    redirect(`/${lang}/login`);
  }

  return (
    <StudentHomeworkClient
      locale={lang}
      studentName={session.user.fullName}
    />
  );
}
