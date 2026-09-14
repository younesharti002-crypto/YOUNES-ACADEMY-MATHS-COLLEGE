"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LiveSession = {
  id: string;
  title: string;
  subjectName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
  replayUrl: string | null;
};
type AssessmentAttempt = { assessmentId: string; percent: number };
type AssessmentItem = { id: string };

const navIcon = "grid size-8 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-accent";

export function StudentHome({
  locale,
  studentName,
  progressPercent,
  progressCompleted,
  progressTotal,
}: {
  locale: "ar" | "fr";
  studentName: string;
  progressPercent: number;
  progressCompleted: number;
  progressTotal: number;
}) {
  const ar = locale === "ar";
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);

  useEffect(() => {
    let active = true;

    fetch("/api/v1/student/live", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (active && json?.data?.sessions) setSessions(json.data.sessions as LiveSession[]);
      })
      .catch(() => undefined);

    fetch("/api/v1/student/assessments", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!active || !json?.data) return;
        setAssessments((json.data.assessments || []) as AssessmentItem[]);
        setAttempts((json.data.attempts || []) as AssessmentAttempt[]);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const liveNow = sessions.find((session) => session.status === "LIVE");
  const scheduled = sessions
    .filter((session) => session.status === "SCHEDULED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const nextLive = liveNow || scheduled || null;
  const replayCount = sessions.filter(
    (session) => session.status === "COMPLETED" && session.replayUrl,
  ).length;
  const bestQuizScore = attempts.length
    ? Math.max(...attempts.map((attempt) => attempt.percent))
    : null;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const navItems = [
    { href: `/${locale}/dashboard`, icon: "⌂", label: ar ? "الرئيسية" : "Accueil", active: true },
    { href: `/${locale}/courses`, icon: "▣", label: ar ? "دروسي" : "Mes cours" },
    { href: `/${locale}/live`, icon: "▶", label: ar ? "التسجيلات" : "Replays" },
    { href: `/${locale}/assessments`, icon: "✎", label: ar ? "التمارين" : "Exercices" },
    { href: `/${locale}/assessments`, icon: "▥", label: ar ? "النتائج" : "Résultats" },
  ];

  return (
    <main
      className="min-h-screen bg-[#f3f1ec] text-[#111827]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="mx-auto min-h-screen max-w-[1560px] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-e border-white/10 bg-board-900 px-4 py-6 text-chalk lg:flex lg:flex-col">
          <Link href={`/${locale}`} className="flex items-center gap-3 px-2">
            <span className="grid size-11 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-black text-accent shadow-[0_0_30px_rgba(209,166,54,0.12)]">
              YA
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[0.06em]">YOUNES</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-accent">Academy</span>
            </span>
          </Link>

          <nav className="mt-10 space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  item.active
                    ? "bg-gradient-to-r from-accent to-accent-soft text-board-900 shadow-[0_12px_30px_rgba(209,166,54,0.2)]"
                    : "text-chalk-dim hover:bg-white/[0.06] hover:text-chalk"
                }`}
              >
                <span className={item.active ? "grid size-8 place-items-center text-sm" : navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-accent/15 bg-white/[0.035] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              {ar ? "حساب التلميذ" : "Compte élève"}
            </p>
            <p className="mt-2 truncate text-sm font-bold text-chalk">{studentName}</p>
            <Link href={`/${locale}`} className="mt-4 inline-flex text-xs font-semibold text-chalk-dim hover:text-accent">
              {ar ? "العودة للموقع" : "Retour au site"}
            </Link>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f8f7f4]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href={`/${locale}`} className="flex items-center gap-2 lg:hidden">
                <span className="grid size-9 place-items-center rounded-xl bg-board-900 text-xs font-black text-accent">YA</span>
                <span className="text-xs font-black text-board-900">YOUNES</span>
              </Link>

              <div className="ms-auto flex items-center gap-3">
                <div className="hidden text-end sm:block">
                  <p className="text-[11px] text-[#7b7b78]">{ar ? "مرحبا بك" : "Bienvenue"}</p>
                  <p className="max-w-[180px] truncate text-sm font-bold text-[#111827]">{studentName}</p>
                </div>
                <div className="grid size-10 place-items-center rounded-full border border-[#dedbd3] bg-white text-sm font-black text-board-900 shadow-sm">
                  {studentName.trim().charAt(0).toUpperCase() || "S"}
                </div>
              </div>
            </div>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.slice(0, 4).map((item) => (
                <Link
                  key={`mobile-${item.label}`}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold ${
                    item.active ? "bg-board-900 text-accent" : "border border-[#dedbd3] bg-white text-[#555]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-medium text-[#77736b]">{ar ? "👋 مرحبا" : "👋 Bonjour"}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
                  {studentName}
                </h1>
                <p className="mt-2 text-sm text-[#77736b]">
                  {ar ? "واصل رحلتك نحو التفوق من نفس المكان." : "Continuez votre parcours vers la réussite depuis un seul espace."}
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e4d7ae] bg-[#fffaf0] px-4 py-2 text-xs font-bold text-[#8a6718]">
                <span className="size-2 rounded-full bg-accent" />
                {ar ? "فضاء المشتركين" : "Espace abonnés"}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#7b7b78]">{ar ? "تقدمك الدراسي" : "Progression"}</p>
                    <p className="mt-2 text-3xl font-black text-[#111827]">{progressPercent}%</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#fff6dc] text-lg text-[#b98516]">↗</span>
                </div>
                <p className="mt-3 text-xs text-[#8c8982]">
                  {progressCompleted} / {progressTotal} {ar ? "درس مكتمل" : "leçons terminées"}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eceae5]">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
                </div>
              </article>

              <article className="rounded-3xl border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#7b7b78]">{ar ? "أفضل نتيجة" : "Meilleur score"}</p>
                    <p className="mt-2 text-3xl font-black text-[#111827]">{bestQuizScore === null ? "—" : `${bestQuizScore}%`}</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#f1edff] text-lg text-[#7556b8]">★</span>
                </div>
                <p className="mt-3 text-xs text-[#8c8982]">
                  {assessments.length} {ar ? "اختبار منشور" : "évaluations"} · {attempts.length} {ar ? "محاولة" : "tentatives"}
                </p>
                <Link href={`/${locale}/assessments`} className="mt-4 inline-flex text-xs font-black text-[#9a741d] hover:underline">
                  {ar ? "عرض التمارين" : "Voir les exercices"}
                </Link>
              </article>

              <article className="rounded-3xl border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#7b7b78]">{ar ? "التسجيلات المتاحة" : "Replays disponibles"}</p>
                    <p className="mt-2 text-3xl font-black text-[#111827]">{replayCount}</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#edf5ff] text-lg text-[#4270a8]">▶</span>
                </div>
                <p className="mt-3 text-xs text-[#8c8982]">{ar ? "تسجيلات منشورة داخل اشتراكك" : "Replays publiés dans votre abonnement"}</p>
                <Link href={`/${locale}/live`} className="mt-4 inline-flex text-xs font-black text-[#9a741d] hover:underline">
                  {ar ? "فتح التسجيلات" : "Voir les replays"}
                </Link>
              </article>

              <article className={`rounded-3xl border bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)] ${nextLive?.status === "LIVE" ? "border-[#efb7b7]" : "border-[#e4e1d9]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs font-black ${nextLive?.status === "LIVE" ? "text-[#c44040]" : "text-[#7b7b78]"}`}>
                      {nextLive?.status === "LIVE" ? "● LIVE NOW" : ar ? "الحصة القادمة" : "Prochain live"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-base font-black text-[#111827]">
                      {nextLive ? nextLive.title : ar ? "لا توجد حصة مبرمجة" : "Aucun live programmé"}
                    </p>
                  </div>
                  <span className={`grid size-10 place-items-center rounded-2xl text-lg ${nextLive?.status === "LIVE" ? "bg-[#fff0f0] text-[#c44040]" : "bg-[#fff6dc] text-[#b98516]"}`}>◉</span>
                </div>
                {nextLive ? (
                  <p className="mt-3 text-xs leading-5 text-[#8c8982]">
                    {nextLive.subjectName} · {formatDate(nextLive.scheduledAt)}
                  </p>
                ) : null}
                <Link href={`/${locale}/live`} className="mt-4 inline-flex text-xs font-black text-[#9a741d] hover:underline">
                  {ar ? "الحصص المباشرة" : "Voir les lives"}
                </Link>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[2rem] border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#9a741d]">{ar ? "مسارك الدراسي" : "Votre parcours"}</p>
                    <h2 className="mt-1 text-xl font-black text-[#111827]">{ar ? "استمر من حيث توقفت" : "Reprendre votre progression"}</h2>
                  </div>
                  <Link href={`/${locale}/courses`} className="rounded-full border border-[#dfd6ba] bg-[#fffaf0] px-4 py-2 text-xs font-black text-[#8a6718]">
                    {ar ? "فتح دروسي" : "Mes cours"}
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                  <div className="relative mx-auto grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(#d1a636 ${progressPercent}%, #eceae5 0)` }}>
                    <div className="grid size-[104px] place-items-center rounded-full bg-white text-center">
                      <div>
                        <p className="text-2xl font-black text-[#111827]">{progressPercent}%</p>
                        <p className="text-[10px] font-bold text-[#88847c]">{ar ? "منجز" : "terminé"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111827]">
                      {ar ? "كل درس تكمله يرفع تقدمك الحقيقي داخل المنصة." : "Chaque leçon terminée met à jour votre progression réelle."}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[#7d7971]">
                      {ar
                        ? `${progressCompleted} من أصل ${progressTotal} درس تم إكمالها حتى الآن.`
                        : `${progressCompleted} leçons terminées sur ${progressTotal} pour le moment.`}
                    </p>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eceae5]">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-board-900 p-5 text-chalk shadow-[0_18px_45px_rgba(5,16,28,0.18)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-accent">{ar ? "أدواتك" : "Vos outils"}</p>
                    <h2 className="mt-1 text-xl font-black">{ar ? "كل ما تحتاجه هنا" : "Tout au même endroit"}</h2>
                  </div>
                  <span className="text-2xl text-accent">YA</span>
                </div>

                <div className="mt-5 grid gap-2.5">
                  <Link href={`/${locale}/courses`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold transition hover:border-accent/30 hover:bg-white/[0.07]">
                    <span>{ar ? "دروسي" : "Mes cours"}</span><span className="text-accent">←</span>
                  </Link>
                  <Link href={`/${locale}/live`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold transition hover:border-accent/30 hover:bg-white/[0.07]">
                    <span>{ar ? "Live & Replays" : "Lives & replays"}</span><span className="text-accent">←</span>
                  </Link>
                  <Link href={`/${locale}/assessments`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold transition hover:border-accent/30 hover:bg-white/[0.07]">
                    <span>{ar ? "التمارين والاختبارات" : "Exercices & quiz"}</span><span className="text-accent">←</span>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
