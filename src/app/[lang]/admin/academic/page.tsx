import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AcademicAdminClient } from "@/components/academic-admin-client";
import {
  getAuthenticatedSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export default async function AcademicAdminPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "ar";
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="relative">
      <div className="fixed right-4 top-4 z-50 flex gap-2" dir={locale === "ar" ? "rtl" : "ltr"}>
        <Link
          href={`/${locale}/admin/security`}
          className="rounded-full border border-white/15 bg-board-900/90 px-4 py-2 text-sm font-semibold text-chalk shadow-lg backdrop-blur transition hover:bg-white/10"
        >
          {locale === "ar" ? "الأمان وكلمات السر" : "Sécurité & mots de passe"}
        </Link>
        <Link
          href={`/${locale}/studio`}
          className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-board-900 shadow-lg transition-opacity hover:opacity-90"
        >
          {locale === "ar" ? "Content Studio" : "Content Studio"}
        </Link>
      </div>
      <AcademicAdminClient lang={locale} />
    </div>
  );
}
