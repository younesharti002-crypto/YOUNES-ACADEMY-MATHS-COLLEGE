"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Course = { id: string; title: string; status: string };
type LiveSession = { id: string; courseId: string; title: string; description: string | null; scheduledAt: string; durationMinutes: number; joinUrl: string | null; replayUrl: string | null; replayPdfUrl: string | null; status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" };
type Data = { courses: Course[]; sessions: LiveSession[] };
const EMPTY: Data = { courses: [], sessions: [] };
const panel = "rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-[0_18px_45px_rgba(0,0,0,0.16)]";

export function LiveStudio({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data>(EMPTY);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/v1/admin/live", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) {
      const next = json.data as Data;
      setData(next);
      setCourseId((current) => current || next.courses[0]?.id || "");
    } else setMessage(json.error?.message || "Unable to load live classes.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedCourse = data.courses.find((course) => course.id === courseId);
  const sessions = useMemo(() => data.sessions.filter((session) => !courseId || session.courseId === courseId), [data.sessions, courseId]);

  async function mutate(payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/admin/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(json.error?.message || "Operation failed."); return false; }
    setMessage(success); await load(); return true;
  }

  async function createLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawSchedule = String(form.get("scheduledAt") || "");
    const date = new Date(rawSchedule);
    const ok = await mutate({ operation: "live.create", courseId, title: form.get("title"), description: form.get("description"), scheduledAt: Number.isNaN(date.getTime()) ? rawSchedule : date.toISOString(), durationMinutes: form.get("durationMinutes"), joinUrl: form.get("joinUrl") }, ar ? "تمت برمجة الحصة المباشرة." : "Cours en direct programmé.");
    if (ok) event.currentTarget.reset();
  }

  async function setStatus(id: string, status: LiveSession["status"]) {
    await mutate({ operation: "status.set", id, status }, ar ? "تم تحديث حالة الحصة." : "Statut du live mis à jour.");
  }

  async function setReplay(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate({ operation: "replay.set", id, replayUrl: form.get("replayUrl"), replayPdfUrl: form.get("replayPdfUrl") }, ar ? "تم نشر التسجيل للتلاميذ." : "Replay publié pour les élèves.");
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  if (loading) return <main className="min-h-screen bg-board-900 px-6 py-12 text-chalk">{ar ? "جاري تحميل الحصص..." : "Chargement des lives..."}</main>;

  return (
    <main className="min-h-screen bg-board-900 text-chalk" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-white/10 bg-[#06111d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/studio`} className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-black text-accent">YA</span><span><span className="block text-sm font-black">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.28em] text-accent">Teacher Studio</span></span></Link>
          <nav className="ms-auto flex flex-wrap gap-2 text-xs font-bold">
            <Link href={`/${lang}/studio`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "المحتوى" : "Contenu"}</Link>
            <Link href={`/${lang}/studio/live`} className="rounded-full bg-accent px-4 py-2 text-board-900">Live</Link>
            <Link href={`/${lang}/studio/assessments`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">Quiz</Link>
            <Link href={`/${lang}/live`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "معاينة الطالب" : "Vue élève"}</Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><span className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">LIVE STUDIO</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? "الحصص المباشرة والتسجيلات" : "Lives & replays"}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-chalk-dim">{ar ? "برمج الحصة، فعّلها وقت البث، ومن بعد النهاية نشر Replay والـPDF من نفس المكان." : "Programmez, lancez le direct puis publiez le replay et son document depuis le même espace."}</p></div>
          <div className="grid grid-cols-2 gap-2"><Metric value={sessions.length} label={ar ? "حصص" : "Sessions"} /><Metric value={sessions.filter((item) => item.status === "COMPLETED").length} label="Replays" /></div>
        </header>

        {message ? <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{message}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={createLive} className={`${panel} p-6`}>
            <p className="text-[10px] font-black tracking-[0.18em] text-accent">01 · SCHEDULE</p><h2 className="mt-2 text-xl font-black">{ar ? "برمجة حصة" : "Programmer un live"}</h2>
            <label className="mt-5 block text-xs font-bold text-chalk-dim">{ar ? "الكورس" : "Cours"}</label>
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)} required className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/60"><option value="">{ar ? "اختر الكورس" : "Choisir un cours"}</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            <div className="mt-3 space-y-3">
              <input name="title" required placeholder={ar ? "عنوان الحصة" : "Titre du live"} className="w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
              <textarea name="description" placeholder={ar ? "ماذا ستشرح في هذه الحصة؟" : "Contenu de la séance"} className="min-h-24 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
              <div className="grid gap-3 sm:grid-cols-2"><input name="scheduledAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/60" /><input name="durationMinutes" type="number" min="1" max="300" defaultValue="90" required className="rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/60" /></div>
              <input name="joinUrl" dir="ltr" placeholder="https://meet.google.com/..." className="w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
            </div>
            <button disabled={busy || !courseId} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 disabled:opacity-50">{ar ? "برمجة الحصة" : "Programmer"}</button>
          </form>

          <section className={`${panel} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.18em] text-accent">02 · CONTROL ROOM</p><h2 className="mt-2 text-xl font-black">{selectedCourse?.title || (ar ? "الحصص" : "Sessions")}</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-chalk-dim">{sessions.length}</span></div>
            <div className="mt-5 space-y-4">
              {sessions.map((session) => (
                <article key={session.id} className="rounded-3xl border border-white/10 bg-[#081827]/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><StatusBadge status={session.status} /><h3 className="mt-3 text-lg font-black">{session.title}</h3><p className="mt-1 text-xs text-chalk-dim">{formatDate(session.scheduledAt)} · {session.durationMinutes} min</p>{session.description ? <p className="mt-3 text-sm leading-6 text-chalk-dim">{session.description}</p> : null}</div>{session.joinUrl ? <a href={session.joinUrl} target="_blank" rel="noreferrer" className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-black text-accent">{ar ? "فتح رابط البث" : "Ouvrir le live"}</a> : null}</div>
                  <div className="mt-4 flex flex-wrap gap-2"><SmallButton busy={busy} onClick={() => void setStatus(session.id, "SCHEDULED")}>SCHEDULED</SmallButton><SmallButton busy={busy} onClick={() => void setStatus(session.id, "LIVE")}>● LIVE</SmallButton><SmallButton busy={busy} onClick={() => void setStatus(session.id, "COMPLETED")}>COMPLETED</SmallButton><SmallButton busy={busy} onClick={() => void setStatus(session.id, "CANCELLED")}>CANCELLED</SmallButton></div>
                  <form onSubmit={(event) => void setReplay(event, session.id)} className="mt-5 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-[1fr_1fr_auto]"><input name="replayUrl" dir="ltr" defaultValue={session.replayUrl || ""} placeholder="Replay URL" className="rounded-2xl border border-white/10 bg-board-900 px-3 py-2.5 text-xs text-chalk outline-none focus:border-accent/60" /><input name="replayPdfUrl" dir="ltr" defaultValue={session.replayPdfUrl || ""} placeholder="Replay PDF" className="rounded-2xl border border-white/10 bg-board-900 px-3 py-2.5 text-xs text-chalk outline-none focus:border-accent/60" /><button disabled={busy} className="rounded-2xl bg-accent px-4 py-2.5 text-xs font-black text-board-900 disabled:opacity-50">{ar ? "نشر التسجيل" : "Publier"}</button></form>
                </article>
              ))}
              {sessions.length === 0 ? <p className="rounded-3xl border border-white/10 p-6 text-sm text-chalk-dim">{ar ? "مازال ما تبرمجت حتى حصة لهذا الكورس." : "Aucun live programmé pour ce cours."}</p> : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="min-w-[88px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center"><p className="text-xl font-black text-accent">{value}</p><p className="mt-1 text-[9px] font-bold text-chalk-dim">{label}</p></div>; }
function StatusBadge({ status }: { status: LiveSession["status"] }) { const className = status === "LIVE" ? "border-red-400/30 bg-red-400/10 text-red-300" : status === "COMPLETED" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : status === "CANCELLED" ? "border-white/10 bg-white/5 text-chalk-dim" : "border-accent/30 bg-accent/10 text-accent"; return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.15em] ${className}`}>{status}</span>; }
function SmallButton({ children, busy, onClick }: { children: React.ReactNode; busy: boolean; onClick: () => void }) { return <button type="button" disabled={busy} onClick={onClick} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-chalk-dim transition hover:border-accent/40 hover:text-accent disabled:opacity-50">{children}</button>; }
