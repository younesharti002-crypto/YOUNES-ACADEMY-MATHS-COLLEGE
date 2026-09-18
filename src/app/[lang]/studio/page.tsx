import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ContentStudio } from "@/components/content/ContentStudio";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function StudioPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "ar";
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token) : null;

  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="relative">
      <div
        className="fixed end-4 top-4 z-50 flex gap-2"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <Link
          href={`/${locale}/homework`}
          className="rounded-full border border-accent/25 bg-board-900/90 px-4 py-2 text-sm font-black text-accent shadow-lg backdrop-blur transition hover:bg-white/10"
        >
          {locale === "ar" ? "الواجبات" : "Devoirs"}
        </Link>
        <Link
          href={`/${locale}/attendance`}
          className="rounded-full border border-accent/25 bg-board-900/90 px-4 py-2 text-sm font-black text-accent shadow-lg backdrop-blur transition hover:bg-white/10"
        >
          {locale === "ar" ? "الحضور" : "Présences"}
        </Link>
        {session.user.role === "ADMIN" && (
          <Link
            href={`/${locale}/admin`}
            className="rounded-full border border-white/15 bg-board-900/90 px-4 py-2 text-sm font-bold text-white/75 shadow-lg backdrop-blur transition hover:bg-white/10"
          >
            {locale === "ar" ? "لوحة Academy" : "Admin Academy"}
          </Link>
        )}
      </div>
      <ContentStudio lang={locale} />
    </div>
  );
}
