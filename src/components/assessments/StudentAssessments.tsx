"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Assessment = { id: string; courseId: string; courseTitle: string; subjectName: string; title: string; description: string | null; kind: "EXERCISE" | "QUIZ"; passingPercent: number };
type Question = { id: string; assessmentId: string; prompt: string; position: number; points: number };
type Choice = { id: string; questionId: string; label: string; position: number };
type Attempt = { id: string; assessmentId: string; score: number; maxScore: number; percent: number; submittedAt: string };
type Review = { questionId: string; selectedChoiceId: string | null; isCorrect: boolean; earnedPoints: number; points: number; explanation: string | null; correctChoiceIds: string[] };
type Data = { assessments: Assessment[]; questions: Question[]; choices: Choice[]; attempts: Attempt[] };

export function StudentAssessments({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data>({ assessments: [], questions: [], choices: [], attempts: [] });
  const [selectedId, setSelectedId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review[] | null>(null);
  const [result, setResult] = useState<{ percent: number; score: number; maxScore: number; passed: boolean; passingPercent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/v1/student/assessments", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) {
      setData(json.data as Data);
      setSelectedId((current) => current || json.data.assessments?.[0]?.id || "");
    } else setError(json.error?.message || "Unable to load assessments.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = data.assessments.find((item) => item.id === selectedId) || null;
  const questions = useMemo(() => data.questions.filter((item) => item.assessmentId === selectedId).sort((a,b) => a.position-b.position), [data.questions, selectedId]);
  const attempts = data.attempts.filter((item) => item.assessmentId === selectedId);
  const best = attempts.length ? Math.max(...attempts.map((item) => item.percent)) : null;

  function chooseAssessment(id: string) {
    setSelectedId(id); setAnswers({}); setReview(null); setResult(null);
  }

  async function submit() {
    if (!selected || questions.length === 0) return;
    setBusy(true); setError("");
    const response = await fetch("/api/v1/student/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: selected.id, answers: questions.map((question) => ({ questionId: question.id, choiceId: answers[question.id] || null })) }),
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) { setError(json.error?.message || "Submission failed."); return; }
    setReview(json.data.review as Review[]);
    setResult({ percent: json.data.attempt.percent, score: json.data.attempt.score, maxScore: json.data.attempt.maxScore, passed: json.data.passed, passingPercent: json.data.passingPercent });
    await load();
  }

  if (loading) return <main className="min-h-screen bg-[#f3f1ec] px-6 py-12 text-[#111827]">{ar ? "جاري تحميل التمارين..." : "Chargement des exercices..."}</main>;

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
        <header className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#087f7b]">EXERCISES & QUIZZES</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{ar ? "التمارين والاختبارات" : "Exercices & quiz"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77736b]">{ar ? "جاوب، خذ التصحيح مباشرة، وتابع أحسن نتيجة ديالك." : "Répondez, obtenez la correction immédiate et suivez votre meilleur score."}</p>
        </header>

        {error ? <div className="mb-5 rounded-2xl border border-[#ead7d7] bg-white px-4 py-3 text-sm text-[#a94343] shadow-sm">{error}</div> : null}

        {data.assessments.length === 0 ? (
          <section className="rounded-[2rem] border border-[#e4e1d9] bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-black">{ar ? "مازال ما تنشر حتى تمرين." : "Aucune évaluation publiée."}</h2><p className="mt-2 text-sm text-[#77736b]">{ar ? "غادي يبان هنا أي Quiz أو Exercise ينشره الأستاذ." : "Les quiz publiés par le professeur apparaîtront ici."}</p></section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[.35fr_.65fr]">
            <aside className="space-y-3">
              {data.assessments.map((item) => {
                const itemAttempts = data.attempts.filter((attempt) => attempt.assessmentId === item.id);
                const itemBest = itemAttempts.length ? Math.max(...itemAttempts.map((attempt) => attempt.percent)) : null;
                return (
                  <button key={item.id} onClick={() => chooseAssessment(item.id)} className={`w-full rounded-[1.6rem] border p-5 text-start shadow-sm transition ${selectedId === item.id ? "border-[#28bdb8] bg-board-900 text-chalk shadow-[0_14px_35px_rgba(5,16,28,0.13)]" : "border-[#e4e1d9] bg-white hover:border-[#8bd8d4]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><span className={`text-[10px] font-black tracking-[0.14em] ${selectedId === item.id ? "text-accent" : "text-[#087f7b]"}`}>{item.kind} · {item.subjectName}</span><h3 className="mt-2 font-black leading-6">{item.title}</h3><p className={`mt-1 text-xs ${selectedId === item.id ? "text-chalk-dim" : "text-[#817d75]"}`}>{item.courseTitle}</p></div>
                      {itemBest !== null ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${selectedId === item.id ? "bg-emerald-400/10 text-emerald-300" : "bg-[#edf8f0] text-[#39724d]"}`}>{itemBest}%</span> : null}
                    </div>
                  </button>
                );
              })}
            </aside>

            {selected ? (
              <div className="rounded-[2rem] border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-[10px] font-black tracking-[0.16em] text-[#087f7b]">{selected.kind} · {selected.subjectName}</p><h2 className="mt-2 text-2xl font-black">{selected.title}</h2>{selected.description ? <p className="mt-2 text-sm leading-7 text-[#77736b]">{selected.description}</p> : null}</div>
                  <div className="rounded-2xl bg-board-900 px-4 py-3 text-center text-chalk"><p className="text-[10px] text-chalk-dim">{ar ? "أفضل نتيجة" : "Meilleur score"}</p><p className="mt-1 text-xl font-black text-accent">{best === null ? "—" : `${best}%`}</p></div>
                </div>

                {result ? (
                  <section className={`mt-6 rounded-3xl border p-6 text-center ${result.passed ? "border-[#cfe3d7] bg-[#f1faf4]" : "border-[#e5d8ad] bg-[#fff9e9]"}`}>
                    <p className={`text-xs font-black tracking-[0.15em] ${result.passed ? "text-[#39724d]" : "text-[#8d6817]"}`}>{result.passed ? (ar ? "✓ ناجح" : "✓ RÉUSSI") : (ar ? "محاولة مسجلة" : "TENTATIVE ENREGISTRÉE")}</p>
                    <p className="mt-2 text-5xl font-black">{result.percent}%</p>
                    <p className="mt-2 text-sm text-[#77736b]">{result.score} / {result.maxScore} · {ar ? `النجاح من ${result.passingPercent}%` : `Seuil ${result.passingPercent}%`}</p>
                  </section>
                ) : null}

                <div className="mt-7 space-y-5">
                  {questions.map((question, index) => {
                    const choices = data.choices.filter((choice) => choice.questionId === question.id).sort((a,b) => a.position-b.position);
                    const feedback = review?.find((item) => item.questionId === question.id) || null;
                    return (
                      <article key={question.id} className="rounded-3xl border border-[#e7e3da] bg-[#fbfaf7] p-5">
                        <div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-board-900 text-xs font-black text-accent">{index + 1}</span><div><h3 className="font-bold leading-7">{question.prompt}</h3><p className="mt-1 text-xs text-[#8b877f]">{question.points} pt{question.points > 1 ? "s" : ""}</p></div></div>
                        <div className="mt-4 space-y-2">
                          {choices.map((choice) => {
                            const selectedChoice = answers[question.id] === choice.id;
                            const isCorrectChoice = feedback?.correctChoiceIds.includes(choice.id);
                            const wrongSelected = Boolean(feedback && selectedChoice && !isCorrectChoice);
                            return (
                              <label key={choice.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${feedback && isCorrectChoice ? "border-[#cfe3d7] bg-[#edf8f0] text-[#315f41]" : wrongSelected ? "border-[#efd2d2] bg-[#fff0f0] text-[#a54141]" : selectedChoice ? "border-[#28bdb8] bg-[#ecfffe]" : "border-[#e5e1d8] bg-white hover:border-[#8bd8d4]"}`}>
                                <input type="radio" name={question.id} checked={selectedChoice} disabled={Boolean(review)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))} />
                                <span>{choice.label}</span>{feedback && isCorrectChoice ? <span className="ms-auto font-black">✓</span> : null}
                              </label>
                            );
                          })}
                        </div>
                        {feedback ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${feedback.isCorrect ? "border-[#cfe3d7] bg-[#edf8f0]" : "border-[#efd2d2] bg-[#fff0f0]"}`}><p className="font-black">{feedback.isCorrect ? (ar ? `صحيح · +${feedback.earnedPoints}` : `Correct · +${feedback.earnedPoints}`) : (ar ? "جواب غير صحيح" : "Réponse incorrecte")}</p>{feedback.explanation ? <p className="mt-2 leading-6 text-[#6f6b63]">{feedback.explanation}</p> : null}</div> : null}
                      </article>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#817d75]">{attempts.length} {ar ? "محاولة مسجلة" : "tentatives enregistrées"}</p>
                  {review ? <button onClick={() => { setAnswers({}); setReview(null); setResult(null); }} className="rounded-full border border-[#ddd7c9] bg-white px-5 py-2.5 text-sm font-black">{ar ? "محاولة جديدة" : "Nouvelle tentative"}</button> : <button disabled={busy || questions.some((q) => !answers[q.id])} onClick={() => void submit()} className="rounded-full bg-board-900 px-6 py-2.5 text-sm font-black text-accent shadow-sm disabled:cursor-not-allowed disabled:opacity-40">{busy ? (ar ? "جاري التصحيح..." : "Correction...") : (ar ? "إرسال وتصحيح" : "Envoyer & corriger")}</button>}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
