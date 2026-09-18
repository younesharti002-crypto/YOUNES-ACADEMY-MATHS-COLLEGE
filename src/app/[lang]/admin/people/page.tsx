import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AdminPeopleClient } from "@/components/admin/AdminPeopleClient";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function AdminPeoplePage({
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

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  return <AdminPeopleClient locale={lang} />;
}
