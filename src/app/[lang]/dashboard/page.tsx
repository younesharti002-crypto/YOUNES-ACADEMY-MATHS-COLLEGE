import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getStudentProgressSummary } from "@/lib/progress/student-progress";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";
import { StudentHome } from "@/components/dashboard/StudentHome";

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect(`/${lang}/login`);

  const session = await getAuthenticatedSession(token).catch(() => null);
  if (!session) redirect(`/${lang}/login`);

  if (session.user.role === "TEACHER") redirect(`/${lang}/studio`);
  if (session.user.role === "ADMIN") redirect(`/${lang}/admin`);
  if (session.user.role !== "STUDENT") redirect(`/${lang}/login`);

  const dashboard = await (async () => {
    const access = await getStudentSubscriptionAccess(session.user.id);
    const active = access.state === "ACTIVE";
    const progress = active
      ? await getStudentProgressSummary(session.user.id)
      : { totalLessons: 0, startedLessons: 0, completedLessons: 0, percent: 0 };
    return { access, active, progress };
  })().catch(() => null);

  if (!dashboard) redirect(`/${lang}/login`);

  const { access, active, progress } = dashboard;

  const statusLabel = lang === "ar"
    ? active
      ? "اشتراكك مفعل"
      : access.state === "PENDING"
        ? "الاشتراك في انتظار التفعيل"
        : access.state === "SUSPENDED"
          ? "الاشتراك موقوف"
          : access.state === "EXPIRED"
            ? "انتهى الاشتراك"
            : "لا يوجد اشتراك مفعل"
    : active
      ? "Abonnement actif"
      : access.state === "PENDING"
        ? "Activation en attente"
        : access.state === "SUSPENDED"
          ? "Abonnement suspendu"
          : access.state === "EXPIRED"
            ? "Abonnement expiré"
            : "Aucun abonnement actif";

  if (!active) {
    return (
      <main className="grid min-h-screen place-items-center bg-board-900 px-4 text-chalk" dir={lang === "ar" ? "rtl" : "ltr"}>
        <section className="w-full max-w-2xl rounded-[2rem] border border-violet/30 bg-violet/10 p-8 text-center sm:p-10">
          <span className="inline-flex rounded-full border border-violet/30 px-3 py-1 text-xs font-black text-violet">◌ {statusLabel}</span>
          <h1 className="mt-5 text-3xl font-bold">{lang === "ar" ? `مرحبا ${session.user.fullName}` : `Bonjour ${session.user.fullName}`}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-chalk-dim">
            {lang === "ar" ? "الحساب خدام، ولكن الدروس والحصص المباشرة والتسجيلات كتحتاج اشتراك مفعل." : "Votre compte est accessible, mais les cours, lives et replays nécessitent un abonnement actif."}
          </p>
          <Link href={`/${lang}/courses`} className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold hover:border-accent/60">
            {lang === "ar" ? "عرض حالة الاشتراك" : "Voir l’état de l’abonnement"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <StudentHome
        locale={lang}
        studentName={session.user.fullName}
        progressPercent={progress.percent}
        progressCompleted={progress.completedLessons}
        progressTotal={progress.totalLessons}
      />
      <div className="fixed end-5 top-5 z-50 rounded-full border border-emerald-300/25 bg-board-900/90 px-4 py-2 text-xs font-black text-emerald-300 shadow-xl shadow-black/20 backdrop-blur">
        ● {statusLabel}
      </div>
    </>
  );
}
