import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LiveStudio } from "@/components/live/LiveStudio";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function LiveStudioPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "ar";
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token) : null;

  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect(`/${locale}/login`);
  }

  return <LiveStudio lang={locale} />;
}
