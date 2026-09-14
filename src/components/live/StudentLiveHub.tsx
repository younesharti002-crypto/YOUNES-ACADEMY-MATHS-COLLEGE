"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LiveSession = {
  id: string;
  courseId: string;
  courseTitle: string;
  subjectName: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  joinUrl: string | null;
  replayUrl: string | null;
  replayPdfUrl: string | null;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
};
type Data = { subscriptionState: "ACTIVE"; sessions: LiveSession[] };

function embedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") || parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1] || parsed.pathname.match(/^\/embed\/([^/]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function StudentLiveHub({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReplayId, setSelectedReplayId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/v1/student/live", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error?.message || "Unable to load live classes.");
      setLoading(false);
      return;
    }
    const next = json.data as Data;
    setData(next);
    const firstReplay = next.sessions.find((session) => session.status === "COMPLETED" && session.replayUrl);
    setSelectedReplayId((current) => current || firstReplay?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const upcoming = useMemo(() => data?.sessions.filter((session) => session.status === "LIVE" || session.status === "SCHEDULED") ?? [], [data]);
  const replays = useMemo(() => data?.sessions.filter((session) => session.status === "COMPLETED" && session.replayUrl) ?? [], [data]);
  const selectedReplay = replays.find((session) => session.id === selectedReplayId) || null;
  const selectedEmbed = embedUrl(selectedReplay?.replayUrl || null);

  const formatDate = (value: string) => new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  if (loading) {
    return <main className="min-h-screen bg-[#f3f1ec] px-6 py-12 text-[#111827]">{ar ? "جاري تحميل الحصص..." : "Chargement des lives..."}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f3f1ec] text-[#111827]" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-white/10 bg-board-900 text-chalk">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/dashboard`} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-black text-accent">YA</span>
            <span><span className="block text-sm font-black">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.25em] text-accent">Academy</span></span>
          </Link>
          <div className="ms-auto flex gap-2">
            <Link href={`/${lang}/courses`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "دروسي" : "Mes cours"}</Link>
            <Link href={`/${lang}/dashboard`} className="rounded-full bg-accent px-4 py-2 text-xs font-black text-board-900">{ar ? "الرئيسية" : "Dashboard"}</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#087f7b]">LIVE & REPLAYS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{ar ? "الحصص المباشرة والتسجيلات" : "Lives & replays"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77736b]">{ar ? "الحصص المبرمجة ليك والتسجيلات المنشورة حسب اشتراكك." : "Vos lives programmés et les replays disponibles selon votre abonnement."}</p>
        </header>

        {error ? (
          <section className="rounded-[2rem] border border-[#ead7d7] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black">{ar ? "الحصص غير متاحة حالياً" : "Lives indisponibles"}</h2>
            <p className="mt-3 text-sm text-[#77736b]">{error}</p>
            <Link href={`/${lang}/courses`} className="mt-5 inline-flex rounded-full bg-board-900 px-5 py-2.5 text-sm font-black text-accent">{ar ? "العودة لدروسي" : "Retour aux cours"}</Link>
          </section>
        ) : (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#087f7b]">LIVE CLASSES</p><h2 className="mt-2 text-2xl font-black">{ar ? "الحصص القادمة" : "Prochains lives"}</h2></div>
                <span className="rounded-full border border-[#e4e1d9] bg-white px-3 py-1.5 text-xs font-bold text-[#77736b]">{upcoming.length} {ar ? "حصة" : "sessions"}</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {upcoming.map((session) => (
                  <article key={session.id} className={`rounded-[2rem] border bg-white p-6 shadow-[0_14px_35px_rgba(20,24,32,0.05)] ${session.status === "LIVE" ? "border-[#efb7b7]" : "border-[#e4e1d9]"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black tracking-[0.15em] ${session.status === "LIVE" ? "bg-[#fff0f0] text-[#c44040]" : "bg-[#fff7df] text-[#916b16]"}`}>{session.status === "LIVE" ? "● LIVE NOW" : "SCHEDULED"}</span>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f7b]">{session.subjectName}</p>
                        <h3 className="mt-2 text-xl font-black">{session.title}</h3>
                        <p className="mt-1 text-xs text-[#8b877f]">{session.courseTitle}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7f5ef] px-4 py-3 text-center"><p className="text-sm font-black">{formatDate(session.scheduledAt)}</p><p className="mt-1 text-[10px] text-[#8b877f]">{session.durationMinutes} min</p></div>
                    </div>
                    {session.description ? <p className="mt-4 text-sm leading-7 text-[#77736b]">{session.description}</p> : null}
                    <div className="mt-5">
                      {session.status === "LIVE" && session.joinUrl ? (
                        <a href={session.joinUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-board-900 px-5 py-2.5 text-sm font-black text-accent shadow-sm">{ar ? "دخول الحصة الآن" : "Rejoindre maintenant"}</a>
                      ) : (
                        <span className="inline-flex rounded-full border border-[#e4e1d9] bg-[#faf9f6] px-4 py-2 text-xs text-[#77736b]">{ar ? "رابط الدخول يظهر عند بدء الحصة" : "Le lien apparaît au démarrage"}</span>
                      )}
                    </div>
                  </article>
                ))}
                {upcoming.length === 0 ? <div className="rounded-[2rem] border border-[#e4e1d9] bg-white p-8 text-center text-sm text-[#77736b] shadow-sm lg:col-span-2">{ar ? "لا توجد حصة قادمة منشورة حالياً." : "Aucun live à venir pour le moment."}</div> : null}
              </div>
            </section>

            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#087f7b]">REPLAYS</p><h2 className="mt-2 text-2xl font-black">{ar ? "التسجيلات" : "Replays"}</h2></div>
                <span className="rounded-full border border-[#e4e1d9] bg-white px-3 py-1.5 text-xs font-bold text-[#77736b]">{replays.length} {ar ? "تسجيل" : "replays"}</span>
              </div>

              {selectedReplay ? (
                <div className="mb-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
                  <div className="overflow-hidden rounded-[2rem] border border-[#d7d2c7] bg-board-900 shadow-[0_20px_50px_rgba(5,16,28,0.16)]">
                    <div className="aspect-video bg-black/60 text-chalk">
                      {selectedEmbed ? (
                        <iframe src={selectedEmbed} title={selectedReplay.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      ) : (
                        <div className="grid h-full place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-full border border-accent/30 bg-accent/10 text-2xl text-accent">▶</div><h3 className="mt-4 text-xl font-black">{selectedReplay.title}</h3><a href={selectedReplay.replayUrl || "#"} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900">{ar ? "فتح التسجيل" : "Ouvrir le replay"}</a></div></div>
                      )}
                    </div>
                  </div>
                  <aside className="rounded-[2rem] bg-board-900 p-6 text-chalk shadow-[0_18px_45px_rgba(5,16,28,0.15)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-accent">{selectedReplay.subjectName}</p>
                    <h3 className="mt-3 text-xl font-black">{selectedReplay.title}</h3>
                    <p className="mt-2 text-xs text-chalk-dim">{formatDate(selectedReplay.scheduledAt)} · {selectedReplay.durationMinutes} min</p>
                    {selectedReplay.description ? <p className="mt-4 text-sm leading-7 text-chalk-dim">{selectedReplay.description}</p> : null}
                    {selectedReplay.replayPdfUrl ? <a href={selectedReplay.replayPdfUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-black text-accent">{ar ? "ملخص الحصة PDF" : "Document PDF"}</a> : null}
                  </aside>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {replays.map((session) => (
                  <button key={session.id} type="button" onClick={() => setSelectedReplayId(session.id)} className={`rounded-3xl border p-5 text-start shadow-sm transition ${selectedReplayId === session.id ? "border-[#d6b64e] bg-[#fffaf0]" : "border-[#e4e1d9] bg-white hover:border-[#d9c98e]"}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#087f7b]">{session.subjectName}</span>
                    <h3 className="mt-2 font-black">{session.title}</h3>
                    <p className="mt-2 text-xs text-[#8b877f]">{formatDate(session.scheduledAt)}</p>
                  </button>
                ))}
                {replays.length === 0 ? <div className="rounded-[2rem] border border-[#e4e1d9] bg-white p-8 text-center text-sm text-[#77736b] shadow-sm md:col-span-2 xl:col-span-3">{ar ? "مازال ما تنشر حتى Replay." : "Aucun replay publié pour le moment."}</div> : null}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
