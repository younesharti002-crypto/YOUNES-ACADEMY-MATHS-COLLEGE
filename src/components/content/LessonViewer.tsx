"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LessonNav = { id: string; title: string } | null;
type ProgressStatus = "NONE" | "STARTED" | "COMPLETED";

type LessonViewerProps = {
  lang: "ar" | "fr";
  courseId: string;
  courseTitle: string;
  subjectName: string;
  chapterTitle: string;
  lesson: {
    id: string;
    title: string;
    summary: string | null;
    videoUrl: string | null;
    pdfUrl: string | null;
  };
  previousLesson: LessonNav;
  nextLesson: LessonNav;
  initialProgressStatus: ProgressStatus;
};

function getVideoPresentation(url: string | null) {
  if (!url) return { type: "none" as const, url: null };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? { type: "embed" as const, url: `https://www.youtube-nocookie.com/embed/${id}` } : { type: "link" as const, url };
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") || parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1] || parsed.pathname.match(/^\/embed\/([^/]+)/)?.[1];
      return id ? { type: "embed" as const, url: `https://www.youtube-nocookie.com/embed/${id}` } : { type: "link" as const, url };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? { type: "embed" as const, url: `https://player.vimeo.com/video/${id}` } : { type: "link" as const, url };
    }
    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return { type: "video" as const, url };
  } catch {
    return { type: "link" as const, url };
  }
  return { type: "link" as const, url };
}

export function LessonViewer({
  lang,
  courseId,
  courseTitle,
  subjectName,
  chapterTitle,
  lesson,
  previousLesson,
  nextLesson,
  initialProgressStatus,
}: LessonViewerProps) {
  const ar = lang === "ar";
  const video = getVideoPresentation(lesson.videoUrl);
  const lessonHref = (lessonId: string) => `/${lang}/courses/${courseId}/lessons/${lessonId}`;
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>(initialProgressStatus);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    if (initialProgressStatus !== "NONE") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/student/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: lesson.id, status: "STARTED" }),
        });
        if (!response.ok || cancelled) return;
        setProgressStatus("STARTED");
      } catch {
        // Progress tracking must never block lesson viewing.
      }
    })();
    return () => { cancelled = true; };
  }, [initialProgressStatus, lesson.id]);

  async function completeLesson() {
    if (progressStatus === "COMPLETED" || savingProgress) return;
    setSavingProgress(true);
    setProgressError("");
    try {
      const response = await fetch("/api/v1/student/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, status: "COMPLETED" }),
      });
      const json = await response.json();
      if (!response.ok) {
        setProgressError(json.error?.message || (ar ? "تعذر حفظ التقدم." : "Impossible d’enregistrer la progression."));
        return;
      }
      setProgressStatus("COMPLETED");
    } catch {
      setProgressError(ar ? "تعذر حفظ التقدم." : "Impossible d’enregistrer la progression.");
    } finally {
      setSavingProgress(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f1ec] text-[#111827]" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-white/10 bg-board-900 text-chalk">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/dashboard`} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-black text-accent">YA</span>
            <span><span className="block text-sm font-black">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.25em] text-accent">Academy</span></span>
          </Link>
          <div className="ms-auto flex items-center gap-2">
            <span className={`hidden rounded-full px-3 py-1.5 text-xs font-black sm:inline-flex ${progressStatus === "COMPLETED" ? "bg-emerald-400/10 text-emerald-300" : "bg-accent/10 text-accent"}`}>
              {progressStatus === "COMPLETED" ? (ar ? "✓ مكتمل" : "✓ Terminée") : (ar ? "◌ قيد الإنجاز" : "◌ En cours")}
            </span>
            <Link href={`/${lang}/courses`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-chalk-dim transition hover:border-accent/40 hover:text-accent">
              {ar ? "دروسي" : "Mes cours"}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#087f7b]">{subjectName}</p>
          <p className="mt-1 text-sm text-[#7b776f]">{courseTitle} · {chapterTitle}</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-[#d7d2c7] bg-board-900 shadow-[0_24px_55px_rgba(5,16,28,0.18)]">
              <div className="aspect-video bg-black/60 text-chalk">
                {video.type === "embed" ? (
                  <iframe src={video.url} title={lesson.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                ) : video.type === "video" ? (
                  <video src={video.url} controls playsInline className="h-full w-full bg-black object-contain" />
                ) : video.type === "link" ? (
                  <div className="grid h-full place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-full border border-accent/30 bg-accent/10 text-2xl text-accent">▶</div><h2 className="mt-4 text-xl font-black">{ar ? "الفيديو متوفر عبر رابط خارجي" : "Vidéo disponible via un lien externe"}</h2><a href={video.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900">{ar ? "فتح الفيديو" : "Ouvrir la vidéo"}</a></div></div>
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl text-accent">◉</div><h2 className="mt-4 text-xl font-black">{ar ? "الفيديو لم يُضف بعد" : "La vidéo n’est pas encore ajoutée"}</h2><p className="mt-2 text-sm text-chalk-dim">{ar ? "سيظهر هنا مباشرة عندما يضيفه الأستاذ." : "Elle apparaîtra ici dès que le professeur l’ajoutera."}</p></div></div>
                )}
              </div>
            </div>

            <article className="rounded-[2rem] border border-[#e4e1d9] bg-white p-6 shadow-[0_14px_35px_rgba(20,24,32,0.05)] sm:p-8">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#087f7b]">LESSON</span>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{lesson.title}</h1>
              {lesson.summary ? <p className="mt-4 max-w-4xl text-sm leading-8 text-[#716d65] sm:text-base">{lesson.summary}</p> : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {lesson.pdfUrl ? (
                  <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#d4e3e4] bg-[#f8fbfb] px-5 py-2.5 text-sm font-bold text-[#4f6063] transition hover:border-[#28bdb8]">{ar ? "فتح ملخص الدرس PDF" : "Ouvrir le PDF du cours"}</a>
                ) : (
                  <span className="rounded-full border border-[#e4e1d9] bg-[#f7f6f2] px-5 py-2.5 text-sm text-[#8a867e]">{ar ? "PDF غير متوفر بعد" : "PDF pas encore disponible"}</span>
                )}

                <button type="button" onClick={() => void completeLesson()} disabled={progressStatus === "COMPLETED" || savingProgress} className={`rounded-full px-5 py-2.5 text-sm font-black transition ${progressStatus === "COMPLETED" ? "cursor-default bg-[#edf8f0] text-[#39724d]" : "bg-board-900 text-accent hover:bg-board-800 disabled:opacity-60"}`}>
                  {progressStatus === "COMPLETED" ? (ar ? "✓ تم إكمال الدرس" : "✓ Leçon terminée") : savingProgress ? (ar ? "جاري الحفظ..." : "Enregistrement...") : (ar ? "تم إكمال الدرس" : "Marquer comme terminée")}
                </button>
              </div>
              {progressError ? <p className="mt-3 text-xs text-[#b44a4a]">{progressError}</p> : null}
            </article>

            {lesson.pdfUrl ? (
              <section className="overflow-hidden rounded-[2rem] border border-[#e4e1d9] bg-white shadow-[0_14px_35px_rgba(20,24,32,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e2] bg-[#fbfaf7] px-5 py-4 sm:px-6"><h2 className="font-black">{ar ? "وثيقة الدرس" : "Document du cours"}</h2><a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-[#916d18] hover:underline">{ar ? "فتح في نافذة كاملة" : "Ouvrir en plein écran"}</a></div>
                <iframe src={lesson.pdfUrl} title={`${lesson.title} PDF`} className="h-[65vh] min-h-[520px] w-full bg-white" />
              </section>
            ) : null}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[2rem] bg-board-900 p-5 text-chalk shadow-[0_18px_45px_rgba(5,16,28,0.16)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{ar ? "المسار" : "Parcours"}</p>
              <h2 className="mt-2 font-black">{chapterTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-chalk-dim">{courseTitle}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-bold text-chalk-dim">{ar ? "حالة الدرس" : "État de la leçon"}</p>
                <p className={`mt-2 text-sm font-black ${progressStatus === "COMPLETED" ? "text-emerald-300" : "text-accent"}`}>{progressStatus === "COMPLETED" ? (ar ? "✓ مكتمل" : "✓ Terminée") : (ar ? "قيد الإنجاز" : "En cours")}</p>
              </div>
            </div>

            <nav className="space-y-3" aria-label={ar ? "التنقل بين الدروس" : "Navigation entre les leçons"}>
              {previousLesson ? (
                <Link href={lessonHref(previousLesson.id)} className="block rounded-3xl border border-[#e4e1d9] bg-white p-4 shadow-sm transition hover:border-[#d7bd67]"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#99948b]">{ar ? "الدرس السابق" : "Leçon précédente"}</span><p className="mt-2 text-sm font-black">{previousLesson.title}</p></Link>
              ) : null}
              {nextLesson ? (
                <Link href={lessonHref(nextLesson.id)} className="block rounded-3xl border border-[#e4d7ae] bg-[#fffaf0] p-4 shadow-sm transition hover:border-[#d4b34f]"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a741d]">{ar ? "الدرس التالي" : "Leçon suivante"}</span><p className="mt-2 text-sm font-black">{nextLesson.title}</p></Link>
              ) : null}
              {!previousLesson && !nextLesson ? <div className="rounded-3xl border border-[#e4e1d9] bg-white p-4 text-sm text-[#77736b]">{ar ? "هذا هو الدرس المنشور الوحيد في هذا الفصل حالياً." : "C’est la seule leçon publiée dans ce chapitre pour le moment."}</div> : null}
            </nav>
          </aside>
        </div>
      </div>
    </main>
  );
}
