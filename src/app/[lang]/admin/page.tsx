import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ACADEMY_METRICS,
  ACADEMY_PROGRAMS,
  ACADEMY_SEGMENT_LABELS,
  type AcademySegment,
} from "@/lib/academy/catalog";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const SEGMENTS: AcademySegment[] = ["primaire", "college", "lycee"];

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  const rtl = lang === "ar";

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                ACADEMY MANAGEMENT V4
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "لوحة إدارة الأكاديمية" : "Tableau de gestion Academy"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "الهيكلة البيداغوجية المعتمدة: جميع المستويات من 4AP حتى 2BAC، مع شعب SVT وPC وECO. تعيين الأساتذة سيضاف بعد التوظيف."
                  : "Structure pédagogique validée : tous les niveaux de 4AP à 2BAC, avec les filières SVT, PC et ECO. L’affectation des professeurs sera ajoutée après recrutement."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/admin/planning`}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5"
              >
                {rtl ? "التخطيط المباشر" : "Planning live"}
              </Link>
              <Link
                href={`/${lang}/admin/academic`}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft"
              >
                {rtl ? "الإدارة الأكاديمية" : "Gestion académique"}
              </Link>
              <Link
                href={`/${lang}/admin/security`}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5"
              >
                {rtl ? "الأمان والحسابات" : "Sécurité & comptes"}
              </Link>
              <Link
                href={`/${lang}/studio`}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5"
              >
                Content Studio
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            value={String(ACADEMY_PROGRAMS.length)}
            label={rtl ? "المستويات / الشعب" : "Niveaux / filières"}
          />
          <Metric
            value={String(ACADEMY_METRICS.weeklySessions)}
            label={rtl ? "حصة أسبوعية" : "Séances / semaine"}
          />
          <Metric
            value={String(ACADEMY_METRICS.weeklyHours)}
            label={rtl ? "ساعة أسبوعياً" : "Heures / semaine"}
          />
          <Metric
            value={`${ACADEMY_METRICS.occupancyPercent}%`}
            label={rtl ? "استغلال القاعات" : "Occupation"}
          />
          <Metric
            value={String(ACADEMY_METRICS.freeSlots)}
            label={rtl ? "حصة متاحة" : "Créneaux libres"}
          />
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-amber-200">
                {rtl ? "حالة الأساتذة" : "Statut professeurs"}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-50/70">
                {rtl
                  ? "لم يتم تعيين الأساتذة بعد. التخطيط الحالي بيداغوجي، وسيتم ربط كل حصة بالأستاذ بعد التوظيف."
                  : "Les professeurs ne sont pas encore affectés. Le planning actuel est pédagogique; chaque séance sera reliée au professeur après recrutement."}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-amber-200/25 px-3 py-1 text-xs font-black text-amber-200">
              {rtl ? "في انتظار التعيين" : "À affecter"}
            </span>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          {SEGMENTS.map((segment) => {
            const programs = ACADEMY_PROGRAMS.filter(
              (program) => program.segment === segment,
            );
            const sessions = programs.reduce(
              (sum, program) => sum + program.weeklySessions,
              0,
            );

            return (
              <section key={segment}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-accent/70">
                      {segment}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {ACADEMY_SEGMENT_LABELS[segment][lang]}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                    {sessions} {rtl ? "حصة" : "séances"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {programs.map((program) => (
                    <article
                      key={program.key}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-accent/25 hover:bg-white/[0.055]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black">{program.label}</h3>
                          <p className="mt-1 text-xs text-white/45">
                            {program.weeklySessions} {rtl ? "حصص / أسبوع" : "séances / semaine"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/55">
                          {rtl ? "الأستاذ: لاحقاً" : "Prof : à affecter"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {program.subjects.map((item) => (
                          <span
                            key={`${program.key}-${item.subject}`}
                            className="rounded-xl border border-accent/15 bg-accent/[0.07] px-3 py-2 text-xs font-bold text-accent-soft"
                          >
                            {item.subject} × {item.sessions}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>
            {rtl ? "4 قاعات • مدة الحصة 1h30" : "4 salles • séance de 1h30"}
          </span>
          <span>
            {rtl
              ? "المرحلة الحالية: تثبيت الهيكلة الأكاديمية قبل تعيين الأساتذة"
              : "Phase actuelle : structure académique avant affectation des professeurs"}
          </span>
        </footer>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/50">{label}</p>
    </div>
  );
}
