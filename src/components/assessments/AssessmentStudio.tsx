"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Course = { id: string; title: string };
type Assessment = { id: string; courseId: string; title: string; description: string | null; kind: "EXERCISE" | "QUIZ"; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; passingPercent: number };
type Question = { id: string; assessmentId: string; prompt: string; explanation: string | null; position: number; points: number };
type Choice = { id: string; questionId: string; label: string; position: number; isCorrect: boolean };
type Data = { courses: Course[]; assessments: Assessment[]; questions: Question[]; choices: Choice[] };
const emptyData: Data = { courses: [], assessments: [], questions: [], choices: [] };
const panel = "rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-[0_18px_45px_rgba(0,0,0,0.16)]";

export function AssessmentStudio({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data>(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/v1/admin/assessments", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) {
      setData(json.data as Data);
      setSelectedId((current) => current || json.data.assessments?.[0]?.id || "");
    } else setMessage(json.error?.message || "Unable to load assessments.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/admin/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(json.error?.message || "Operation failed."); return false; }
    setMessage(success); await load(); return true;
  }

  const selected = data.assessments.find((item) => item.id === selectedId) || null;
  const questions = useMemo(() => data.questions.filter((item) => item.assessmentId === selectedId).sort((a, b) => a.position - b.position), [data.questions, selectedId]);

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "assessment.create", courseId: form.get("courseId"), title: form.get("title"), description: form.get("description"), kind: form.get("kind"), passingPercent: form.get("passingPercent") }, ar ? "تم إنشاء التمرين." : "Évaluation créée.");
    if (ok) event.currentTarget.reset();
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "question.create", assessmentId: selectedId, prompt: form.get("prompt"), explanation: form.get("explanation"), position: form.get("position"), points: form.get("points") }, ar ? "تمت إضافة السؤال." : "Question ajoutée.");
    if (ok) event.currentTarget.reset();
  }

  async function createChoice(event: FormEvent<HTMLFormElement>, questionId: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "choice.create", questionId, label: form.get("label"), position: form.get("position"), isCorrect: form.get("isCorrect") === "on" }, ar ? "تمت إضافة الاختيار." : "Choix ajouté.");
    if (ok) event.currentTarget.reset();
  }

  if (loading) return <main className="min-h-screen bg-board-900 px-6 py-12 text-chalk">{ar ? "جاري تحميل التمارين..." : "Chargement des évaluations..."}</main>;

  return (
    <main className="min-h-screen bg-board-900 text-chalk" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-white/10 bg-[#06111d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/studio`} className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-black text-accent">YA</span><span><span className="block text-sm font-black">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.28em] text-accent">Teacher Studio</span></span></Link>
          <nav className="ms-auto flex flex-wrap gap-2 text-xs font-bold">
            <Link href={`/${lang}/studio`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "المحتوى" : "Contenu"}</Link>
            <Link href={`/${lang}/studio/live`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">Live</Link>
            <Link href={`/${lang}/studio/assessments`} className="rounded-full bg-accent px-4 py-2 text-board-900">Quiz</Link>
            <Link href={`/${lang}/assessments`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "معاينة الطالب" : "Vue élève"}</Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><span className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">ASSESSMENT STUDIO</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? "التمارين والاختبارات" : "Exercices & quiz"}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-chalk-dim">{ar ? "حضّر التقييم، زيد الأسئلة والاختيارات، حدد التصحيح ومن بعد نشره." : "Créez l’évaluation, ajoutez les questions et choix, définissez la correction puis publiez."}</p></div>
          <div className="grid grid-cols-2 gap-2"><Metric value={data.assessments.length} label={ar ? "تقييمات" : "Évaluations"} /><Metric value={data.questions.length} label={ar ? "أسئلة" : "Questions"} /></div>
        </header>

        {message ? <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{message}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-5">
            <form onSubmit={createAssessment} className={`${panel} p-6`}>
              <p className="text-[10px] font-black tracking-[0.18em] text-accent">01 · CREATE</p><h2 className="mt-2 text-xl font-black">{ar ? "إنشاء تقييم" : "Créer une évaluation"}</h2>
              <select name="courseId" required className="mt-4 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk"><option value="">{ar ? "اختر الكورس" : "Choisir le cours"}</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
              <input name="title" required placeholder={ar ? "عنوان التمرين أو الاختبار" : "Titre"} className="mt-3 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
              <textarea name="description" placeholder={ar ? "وصف قصير" : "Description"} className="mt-3 min-h-20 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55" />
              <div className="mt-3 grid grid-cols-2 gap-3"><select name="kind" className="rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk"><option value="QUIZ">Quiz</option><option value="EXERCISE">Exercise</option></select><label className="rounded-2xl border border-white/10 bg-[#081827] px-4 py-2 text-xs text-chalk-dim">{ar ? "نسبة النجاح" : "Seuil de réussite"}<input name="passingPercent" type="number" min="0" max="100" defaultValue="50" className="mt-1 w-full bg-transparent text-base font-black text-chalk outline-none" /></label></div>
              <button disabled={busy} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 disabled:opacity-50">{ar ? "إنشاء" : "Créer"}</button>
            </form>

            <div className={`${panel} p-5`}>
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-black tracking-[0.18em] text-accent">ASSESSMENTS</p><h2 className="mt-2 font-black">{ar ? "التقييمات الحالية" : "Évaluations actuelles"}</h2></div><span className="text-xs text-chalk-dim">{data.assessments.length}</span></div>
              <div className="mt-4 space-y-2">{data.assessments.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-start transition ${selectedId === item.id ? "border-accent/40 bg-accent/10" : "border-white/10 bg-[#081827]/60 hover:border-white/20"}`}><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-black text-accent">{item.kind}</span><h3 className="mt-1 font-bold">{item.title}</h3></div><Status status={item.status} /></div></button>)}</div>
            </div>
          </div>

          <div className={`${panel} p-6`}>
            {selected ? <>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black tracking-[0.16em] text-accent">{selected.kind}</p><h2 className="mt-2 text-2xl font-black">{selected.title}</h2><p className="mt-1 text-xs text-chalk-dim">{ar ? `النجاح من ${selected.passingPercent}%` : `Réussite à partir de ${selected.passingPercent}%`}</p></div><Status status={selected.status} /></div>
              <div className="mt-4 flex flex-wrap gap-2">{(["DRAFT","PUBLISHED","ARCHIVED"] as const).map((status) => <button key={status} disabled={busy} onClick={() => void mutate({ operation: "status.set", assessmentId: selected.id, status }, ar ? "تم تحديث الحالة." : "Statut mis à jour.")} className={status === "PUBLISHED" ? "rounded-full bg-accent px-3 py-1.5 text-xs font-black text-board-900" : "rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-chalk-dim hover:border-accent/40 hover:text-accent"}>{status}</button>)}<button disabled={busy} onClick={() => void mutate({ operation: "assessment.delete", assessmentId: selected.id }, ar ? "تم الحذف." : "Supprimé.")} className="rounded-full border border-red-400/25 px-3 py-1.5 text-xs font-bold text-red-300">{ar ? "حذف" : "Supprimer"}</button></div>

              <form onSubmit={createQuestion} className="mt-7 rounded-3xl border border-accent/20 bg-accent/[0.05] p-5"><p className="text-[10px] font-black tracking-[0.16em] text-accent">02 · QUESTION</p><textarea name="prompt" required placeholder={ar ? "نص السؤال" : "Question"} className="mt-3 min-h-20 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55" /><textarea name="explanation" placeholder={ar ? "شرح التصحيح بعد الإجابة" : "Explication après correction"} className="mt-3 min-h-16 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55" /><div className="mt-3 flex gap-2"><input name="position" type="number" min="0" defaultValue={questions.length} className="w-20 rounded-2xl border border-white/10 bg-[#081827] px-3 text-sm text-chalk" /><input name="points" type="number" min="1" max="100" defaultValue="1" className="w-20 rounded-2xl border border-white/10 bg-[#081827] px-3 text-sm text-chalk" /><button disabled={busy} className="rounded-full bg-accent px-5 py-2 text-sm font-black text-board-900">{ar ? "إضافة السؤال" : "Ajouter"}</button></div></form>

              <div className="mt-6 space-y-4">{questions.map((question, index) => { const choices = data.choices.filter((choice) => choice.questionId === question.id).sort((a,b) => a.position-b.position); return <article key={question.id} className="rounded-3xl border border-white/10 bg-[#081827]/65 p-5"><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-black text-accent">{index + 1}</span><div><h3 className="font-bold leading-7">{question.prompt}</h3><p className="mt-1 text-xs text-chalk-dim">{question.points} pt{question.points > 1 ? "s" : ""}</p></div></div><div className="mt-4 space-y-2">{choices.map((choice) => <div key={choice.id} className={`rounded-2xl border px-4 py-3 text-sm ${choice.isCorrect ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-chalk-dim"}`}>{choice.isCorrect ? "✓ " : "○ "}{choice.label}</div>)}</div><form onSubmit={(event) => createChoice(event, question.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_70px_auto_auto]"><input name="label" required placeholder={ar ? "اختيار جديد" : "Nouveau choix"} className="rounded-2xl border border-white/10 bg-board-900 px-4 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-dim/55" /><input name="position" type="number" min="0" defaultValue={choices.length} className="rounded-2xl border border-white/10 bg-board-900 px-3 text-sm text-chalk" /><label className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 text-xs text-chalk-dim"><input name="isCorrect" type="checkbox" />{ar ? "صحيح" : "Correct"}</label><button disabled={busy} className="rounded-2xl bg-accent px-4 py-2 text-sm font-black text-board-900">+</button></form></article>; })}</div>
            </> : <div className="grid min-h-80 place-items-center text-sm text-chalk-dim">{ar ? "أنشئ أو اختر تقييماً للبدء." : "Créez ou choisissez une évaluation."}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="min-w-[88px] rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center"><p className="text-xl font-black text-accent">{value}</p><p className="mt-1 text-[9px] font-bold text-chalk-dim">{label}</p></div>; }
function Status({ status }: { status: string }) { return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status === "PUBLISHED" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-300" : status === "ARCHIVED" ? "border-white/10 text-chalk-dim" : "border-accent/25 bg-accent/10 text-accent"}`}>{status}</span>; }
