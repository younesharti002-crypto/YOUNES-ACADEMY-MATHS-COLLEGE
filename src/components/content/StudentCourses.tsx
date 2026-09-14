"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Course = { id: string; title: string; slug: string; description: string | null; subjectName: string };
type Chapter = { id: string; courseId: string; title: string; position: number };
type Lesson = { id: string; chapterId: string; title: string; summary: string | null; videoUrl: string | null; pdfUrl: string | null; position: number };
type Progress = { lessonId: string; status: "STARTED" | "COMPLETED" };
type ProgressSummary = { totalLessons: number; startedLessons: number; completedLessons: number; percent: number };
type Data = {
  subscriptionState?: "ACTIVE";
  courses: Course[];
  chapters: Chapter[];
  lessons: Lesson[];
  progress: Progress[];
  progressSummary: ProgressSummary;
};

type LockedState = {
  badge: string;
  icon: string;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
};

const EMPTY_SUMMARY: ProgressSummary = { totalLessons: 0, startedLessons: 0, completedLessons: 0, percent: 0 };

const LOCKED_STATES: Record<string, LockedState> = {
  SUBSCRIPTION_PENDING: {
    badge: "PENDING", icon: "⏳", titleAr: "اشتراكك في انتظار التفعيل", titleFr: "Votre abonnement est en attente",
    bodyAr: "تم تسجيل الدخول بنجاح. سيتم فتح الدروس تلقائياً مباشرة بعد تفعيل اشتراكك من الإدارة.",
    bodyFr: "Votre connexion est valide. Les cours seront ouverts automatiquement dès l’activation de votre abonnement par l’administration.",
  },
  SUBSCRIPTION_SUSPENDED: {
    badge: "SUSPENDED", icon: "⏸", titleAr: "تم تعليق الاشتراك مؤقتاً", titleFr: "Abonnement temporairement suspendu",
    bodyAr: "حسابك مازال موجوداً، لكن الولوج للمحتوى متوقف حالياً. تواصل مع الإدارة لإعادة التفعيل.",
    bodyFr: "Votre compte reste accessible, mais l’accès aux contenus est suspendu. Contactez l’administration pour le réactiver.",
  },
  SUBSCRIPTION_EXPIRED: {
    badge: "EXPIRED", icon: "⌛", titleAr: "انتهت مدة الاشتراك", titleFr: "Votre abonnement a expiré",
    bodyAr: "يمكنك الدخول لحسابك، لكن الدروس تحتاج إلى تجديد الاشتراك حتى تصبح متاحة من جديد.",
    bodyFr: "Vous pouvez toujours accéder à votre compte, mais un renouvellement est nécessaire pour rouvrir les cours.",
  },
  SUBSCRIPTION_REQUIRED: {
    badge: "LOCKED", icon: "🔒", titleAr: "لا يوجد اشتراك مفعل", titleFr: "Aucun abonnement actif",
    bodyAr: "هذا الحساب غير مرتبط حالياً باشتراك يسمح بالوصول إلى الدروس.",
    bodyFr: "Ce compte n’est actuellement lié à aucun abonnement donnant accès aux cours.",
  },
};

export function StudentCourses({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data>({ courses: [], chapters: [], lessons: [], progress: [], progressSummary: EMPTY_SUMMARY });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [activeCourseId, setActiveCourseId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setErrorCode("");
    const response = await fetch("/api/v1/student/content", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) {
      setErrorCode(json.error?.code || "");
      setError(json.error?.message || "Unable to load courses.");
      setLoading(false);
      return;
    }
    const next = json.data as Data;
    setData({ ...next, progress: next.progress || [], progressSummary: next.progressSummary || EMPTY_SUMMARY });
    setActiveCourseId((current) => current || next.courses[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeCourse = data.courses.find((course) => course.id === activeCourseId);
  const chapters = useMemo(() => data.chapters.filter((chapter) => chapter.courseId === activeCourseId), [data.chapters, activeCourseId]);
  const progressByLesson = useMemo(() => new Map(data.progress.map((item) => [item.lessonId, item.status] as const)), [data.progress]);
  const activeCourseLessonIds = useMemo(() => {
    const chapterIds = new Set(chapters.map((chapter) => chapter.id));
    return data.lessons.filter((lesson) => chapterIds.has(lesson.chapterId)).map((lesson) => lesson.id);
  }, [chapters, data.lessons]);
  const activeCourseCompleted = activeCourseLessonIds.filter((lessonId) => progressByLesson.get(lessonId) === "COMPLETED").length;
  const activeCoursePercent = activeCourseLessonIds.length > 0 ? Math.round((activeCourseCompleted / activeCourseLessonIds.length) * 100) : 0;
  const lockedState = LOCKED_STATES[errorCode];

  if (loading) {
    return <main className="min-h-screen bg-[#f3f1ec] px-6 py-12 text-[#111827]">{ar ? "جاري تحميل دروسك..." : "Chargement de vos cours..."}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f3f1ec] text-[#111827]" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-black/[0.06] bg-board-900 text-chalk">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/dashboard`} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-black text-accent">YA</span>
            <span><span className="block text-sm font-black">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.25em] text-accent">Academy</span></span>
          </Link>
          <Link href={`/${lang}/dashboard`} className="ms-auto rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-chalk-dim transition hover:border-accent/40 hover:text-accent">
            {ar ? "الرئيسية" : "Tableau de bord"}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#087f7b]">YOUNES ACADEMY</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{ar ? "دروسي" : "Mes cours"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#78746c]">{ar ? "المحتوى المنشور والمخصص لمستواك واشتراكك، مرتب باش تكمل من غير تشتت." : "Vos contenus publiés, adaptés à votre niveau et à votre abonnement, organisés pour avancer sans distraction."}</p>
          </div>
          {!error ? (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#cfe3d7] bg-[#f1faf4] px-3 py-1.5 text-xs font-black text-[#39724d]">{ar ? "● اشتراك مفعل" : "● Abonnement actif"}</span>
              <span className="rounded-full border border-[#e5d8ad] bg-[#fff9e9] px-3 py-1.5 text-xs font-black text-[#8d6817]">{ar ? `التقدم ${data.progressSummary.percent}%` : `Progression ${data.progressSummary.percent}%`}</span>
            </div>
          ) : null}
        </header>

        {lockedState ? (
          <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#e5d8ad] bg-white p-7 text-center shadow-[0_18px_45px_rgba(20,24,32,0.06)] sm:p-10">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#fff8e6] text-3xl">{lockedState.icon}</div>
            <span className="mt-5 inline-flex rounded-full bg-board-900 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-accent">{lockedState.badge}</span>
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">{ar ? lockedState.titleAr : lockedState.titleFr}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#77736b] sm:text-base">{ar ? lockedState.bodyAr : lockedState.bodyFr}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${lang}/dashboard`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900">{ar ? "العودة للوحة التلميذ" : "Retour au tableau de bord"}</Link>
              <button type="button" onClick={() => void load()} className="rounded-full border border-[#ddd7c9] bg-white px-5 py-2.5 text-sm font-semibold">{ar ? "إعادة التحقق" : "Vérifier à nouveau"}</button>
            </div>
          </section>
        ) : error ? (
          <div className="rounded-[2rem] border border-[#ead7d7] bg-white p-6 shadow-sm"><h2 className="font-black">{ar ? "المحتوى غير متاح حالياً" : "Contenu indisponible"}</h2><p className="mt-2 text-sm text-[#77736b]">{error}</p></div>
        ) : data.courses.length === 0 ? (
          <div className="rounded-[2rem] border border-[#e4e1d9] bg-white p-8 text-center shadow-sm"><p className="text-lg font-black">{ar ? "مازال ما تنشر حتى كورس ليك." : "Aucun cours n’est encore publié pour vous."}</p><p className="mt-2 text-sm text-[#77736b]">{ar ? "ملي الأستاذ ينشر أول درس غادي يبان هنا مباشرة." : "Le prochain contenu publié apparaîtra ici automatiquement."}</p></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-2.5">
              <div className="mb-3 px-1 text-xs font-black text-[#7d7971]">{ar ? "المواد والكورسات" : "Matières & cours"}</div>
              {data.courses.map((course) => (
                <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={`w-full rounded-3xl border p-4 text-start shadow-sm transition ${activeCourseId === course.id ? "border-[#d9b64c] bg-board-900 text-chalk shadow-[0_14px_35px_rgba(5,16,28,0.14)]" : "border-[#e4e1d9] bg-white hover:border-[#d9c98e]"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${activeCourseId === course.id ? "text-accent" : "text-[#087f7b]"}`}>{course.subjectName}</span>
                  <h2 className="mt-2 font-black">{course.title}</h2>
                  <p className={`mt-1 line-clamp-2 text-xs leading-5 ${activeCourseId === course.id ? "text-chalk-dim" : "text-[#817d75]"}`}>{course.description}</p>
                </button>
              ))}
            </aside>

            <section className="min-w-0">
              {activeCourse ? (
                <div className="mb-5 rounded-[2rem] border border-[#e4e1d9] bg-white p-6 shadow-[0_14px_35px_rgba(20,24,32,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><span className="text-xs font-black uppercase tracking-[0.18em] text-[#087f7b]">{activeCourse.subjectName}</span><h2 className="mt-2 text-2xl font-black">{activeCourse.title}</h2></div>
                    <div className="grid size-14 place-items-center rounded-full bg-[#fff8e6] text-sm font-black text-[#8d6817]">{activeCoursePercent}%</div>
                  </div>
                  {activeCourse.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[#77736b]">{activeCourse.description}</p> : null}
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eceae5]"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-all" style={{ width: `${activeCoursePercent}%` }} /></div>
                </div>
              ) : null}

              <div className="space-y-4">
                {chapters.map((chapter, chapterIndex) => {
                  const lessons = data.lessons.filter((lesson) => lesson.chapterId === chapter.id);
                  return (
                    <article key={chapter.id} className="overflow-hidden rounded-[2rem] border border-[#e4e1d9] bg-white shadow-[0_12px_30px_rgba(20,24,32,0.045)]">
                      <div className="flex items-center gap-3 border-b border-[#ece9e2] bg-[#fbfaf7] px-5 py-4 sm:px-6">
                        <span className="grid size-9 place-items-center rounded-2xl bg-board-900 text-xs font-black text-accent">{String(chapterIndex + 1).padStart(2, "0")}</span>
                        <h3 className="font-black sm:text-lg">{chapter.title}</h3>
                      </div>
                      <div className="divide-y divide-[#ece9e2]">
                        {lessons.map((lesson, lessonIndex) => {
                          const progressStatus = progressByLesson.get(lesson.id);
                          return (
                            <div key={lesson.id} className="p-5 sm:p-6">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#99948b]">LESSON {String(lessonIndex + 1).padStart(2, "0")}</p>
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${progressStatus === "COMPLETED" ? "bg-[#edf8f0] text-[#39724d]" : progressStatus === "STARTED" ? "bg-[#fff6dd] text-[#956d14]" : "bg-[#f0efec] text-[#77736b]"}`}>
                                      {progressStatus === "COMPLETED" ? (ar ? "✓ مكتمل" : "✓ Terminée") : progressStatus === "STARTED" ? (ar ? "◌ بدأت" : "◌ Commencée") : (ar ? "جديد" : "Nouveau")}
                                    </span>
                                  </div>
                                  <h4 className="mt-2 text-base font-black sm:text-lg">{lesson.title}</h4>
                                  {lesson.summary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#77736b]">{lesson.summary}</p> : null}
                                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#99948b]"><span>{lesson.videoUrl ? (ar ? "فيديو" : "Vidéo") : (ar ? "بدون فيديو" : "Sans vidéo")}</span><span>·</span><span>{lesson.pdfUrl ? "PDF" : (ar ? "بدون PDF" : "Sans PDF")}</span></div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Link href={`/${lang}/courses/${activeCourseId}/lessons/${lesson.id}`} className="rounded-full bg-board-900 px-4 py-2 text-xs font-black text-accent shadow-sm transition hover:bg-board-800">{progressStatus === "COMPLETED" ? (ar ? "مراجعة الدرس" : "Revoir la leçon") : (ar ? "فتح الدرس" : "Ouvrir la leçon")}</Link>
                                  {lesson.pdfUrl ? <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#ddd7c9] px-4 py-2 text-xs font-bold text-[#6c675e]">PDF</a> : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {lessons.length === 0 ? <p className="p-5 text-sm text-[#77736b]">{ar ? "لا توجد دروس منشورة في هذا الفصل بعد." : "Aucune leçon publiée dans ce chapitre."}</p> : null}
                      </div>
                    </article>
                  );
                })}
                {chapters.length === 0 ? <p className="rounded-3xl border border-[#e4e1d9] bg-white p-6 text-sm text-[#77736b]">{ar ? "لا توجد فصول منشورة بعد." : "Aucun chapitre publié pour le moment."}</p> : null}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
