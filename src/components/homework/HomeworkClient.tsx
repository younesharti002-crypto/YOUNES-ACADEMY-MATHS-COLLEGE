"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "TEACHER" | "STUDENT";
type Scope = { groupId: string; subjectId: string; groupName: string; subjectName: string };
type Assignment = {
  id: string;
  groupId?: string;
  subjectId?: string;
  groupName: string;
  subjectName: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  createdAt: string;
  submissionId?: string | null;
  submissionStatus?: "SUBMITTED" | "CORRECTED" | null;
  submittedAt?: string | null;
  score?: number | null;
  scoreMax?: number | null;
  correctionComment?: string | null;
};
type Submission = {
  id: string;
  homeworkId: string;
  status: "SUBMITTED" | "CORRECTED";
  submittedAt: string;
  studentName: string;
  studentCode: string;
  score: number | null;
  scoreMax: number | null;
  correctionComment: string | null;
};
type FileRow = {
  id: string;
  submissionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Payload = {
  assignments: Assignment[];
  submissions?: Submission[];
  files?: FileRow[];
  scopes?: Scope[];
};

async function jsonApi(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? "Operation failed");
  return payload;
}

export function HomeworkClient({
  locale,
  role,
}: {
  locale: "ar" | "fr";
  role: Role;
}) {
  const rtl = locale === "ar";
  const [data, setData] = useState<Payload>({ assignments: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const payload = await jsonApi("/api/v1/homework");
      setData(payload.data as Payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filesBySubmission = useMemo(() => {
    const map = new Map<string, FileRow[]>();
    for (const file of data.files ?? []) {
      const rows = map.get(file.submissionId) ?? [];
      rows.push(file);
      map.set(file.submissionId, rows);
    }
    return map;
  }, [data.files]);

  async function createHomework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const scope = String(fd.get("scope") ?? "").split("|");
    if (scope.length !== 2) return;
    setBusy(true);
    setMessage("");
    try {
      await jsonApi("/api/v1/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: scope[0],
          subjectId: scope[1],
          title: fd.get("title"),
          instructions: fd.get("instructions"),
          dueAt: fd.get("dueAt") || null,
        }),
      });
      form.reset();
      setMessage(rtl ? "تم إنشاء الواجب." : "Devoir créé.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadHomework(event: FormEvent<HTMLFormElement>, homeworkId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("homeworkId", homeworkId);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/homework/submit", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Upload failed");
      form.reset();
      setMessage(rtl ? "تم إرسال الجواب للأستاذ." : "Réponse envoyée au professeur.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function correct(event: FormEvent<HTMLFormElement>, submissionId: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const rawScore = String(fd.get("score") ?? "").trim();
    const rawMax = String(fd.get("scoreMax") ?? "").trim();
    setBusy(true);
    setMessage("");
    try {
      await jsonApi("/api/v1/homework/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          score: rawScore === "" ? null : Number(rawScore),
          scoreMax: rawMax === "" ? null : Number(rawMax),
          comment: fd.get("comment"),
        }),
      });
      setMessage(rtl ? "تم حفظ التصحيح." : "Correction enregistrée.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Correction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10" dir={rtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
            HOMEWORK
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            {rtl ? "الواجبات والتصحيح" : "Devoirs & corrections"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-chalk-dim">
            {role === "STUDENT"
              ? rtl
                ? "صوّر الجواب أو ارفع PDF ثم أرسله للأستاذ."
                : "Photographiez votre réponse ou importez un PDF, puis envoyez-le au professeur."
              : rtl
                ? "أنشئ الواجبات، افتح أجوبة التلاميذ، ثم أضف النقطة والتعليق."
                : "Créez les devoirs, ouvrez les réponses des élèves puis ajoutez la note et le commentaire."}
          </p>
        </header>

        {message && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/[0.08] px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        )}

        {role !== "STUDENT" ? (
          <>
            <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black">{rtl ? "إنشاء واجب" : "Créer un devoir"}</h2>
              <form onSubmit={createHomework} className="mt-4 grid gap-4 md:grid-cols-2">
                <select name="scope" required className={inputClass} defaultValue="">
                  <option value="" disabled>{rtl ? "المجموعة والمادة" : "Groupe & matière"}</option>
                  {(data.scopes ?? []).map((scope) => (
                    <option key={scope.groupId + scope.subjectId} value={scope.groupId + "|" + scope.subjectId}>
                      {scope.groupName} · {scope.subjectName}
                    </option>
                  ))}
                </select>
                <input name="title" required maxLength={180} placeholder={rtl ? "عنوان الواجب" : "Titre du devoir"} className={inputClass} />
                <input name="dueAt" type="datetime-local" className={inputClass} />
                <textarea name="instructions" maxLength={4000} placeholder={rtl ? "التعليمات" : "Consignes"} className={inputClass + " md:col-span-2 min-h-24"} />
                <button disabled={busy} className={buttonClass}>{rtl ? "إنشاء الواجب" : "Créer le devoir"}</button>
              </form>
            </section>

            <section className="mt-6 space-y-4">
              {data.assignments.map((assignment) => {
                const rows = (data.submissions ?? []).filter((s) => s.homeworkId === assignment.id);
                return (
                  <article key={assignment.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black text-accent">{assignment.groupName} · {assignment.subjectName}</p>
                        <h2 className="mt-1 text-xl font-black">{assignment.title}</h2>
                        {assignment.instructions && <p className="mt-2 text-sm leading-7 text-white/55">{assignment.instructions}</p>}
                      </div>
                      <span className="text-xs text-white/35">
                        {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString(locale === "ar" ? "ar-MA" : "fr-MA") : (rtl ? "بدون أجل" : "Sans échéance")}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {rows.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/35">
                          {rtl ? "مازال ما توصلنا حتى جواب." : "Aucune réponse reçue."}
                        </p>
                      ) : rows.map((submission) => (
                        <div key={submission.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-black">{submission.studentName}</p>
                              <p className="text-xs text-white/35">{submission.studentCode} · {submission.status}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(filesBySubmission.get(submission.id) ?? []).map((file) => (
                                <a key={file.id} href={"/api/v1/homework/files/" + file.id} target="_blank" rel="noreferrer" className="rounded-full border border-accent/20 px-3 py-1.5 text-xs font-bold text-accent">
                                  {file.fileName}
                                </a>
                              ))}
                            </div>
                          </div>
                          <form onSubmit={(event) => correct(event, submission.id)} className="mt-4 grid gap-3 sm:grid-cols-[100px_100px_1fr_auto]">
                            <input name="score" type="number" min="0" defaultValue={submission.score ?? ""} placeholder={rtl ? "النقطة" : "Note"} className={inputClass} />
                            <input name="scoreMax" type="number" min="1" defaultValue={submission.scoreMax ?? "20"} placeholder="/20" className={inputClass} />
                            <input name="comment" maxLength={3000} defaultValue={submission.correctionComment ?? ""} placeholder={rtl ? "تعليق الأستاذ" : "Commentaire"} className={inputClass} />
                            <button disabled={busy} className={buttonClass}>{rtl ? "حفظ" : "Corriger"}</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : (
          <section className="mt-6 grid gap-4">
            {data.assignments.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-white/10 p-8 text-center text-white/35">
                {rtl ? "ما عندك حتى واجب حالياً." : "Aucun devoir pour le moment."}
              </div>
            ) : data.assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-xs font-black text-accent">{assignment.groupName} · {assignment.subjectName}</p>
                <h2 className="mt-1 text-xl font-black">{assignment.title}</h2>
                {assignment.instructions && <p className="mt-2 text-sm leading-7 text-white/55">{assignment.instructions}</p>}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-white/50">
                    {assignment.submissionStatus ?? (rtl ? "لم يرسل" : "À faire")}
                  </span>
                  {assignment.score !== null && assignment.score !== undefined && (
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-black text-emerald-300">
                      {assignment.score}/{assignment.scoreMax ?? "—"}
                    </span>
                  )}
                </div>
                {assignment.correctionComment && (
                  <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100/80">
                    {assignment.correctionComment}
                  </div>
                )}
                <form onSubmit={(event) => uploadHomework(event, assignment.id)} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input name="file" type="file" required accept="image/jpeg,image/png,application/pdf" className="block w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white/60" />
                  <button disabled={busy} className={buttonClass}>{rtl ? "إرسال الجواب" : "Envoyer"}</button>
                </form>
                <p className="mt-2 text-[11px] text-white/30">JPG · PNG · PDF · max 5 MB</p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent/60";
const buttonClass =
  "rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-board-900 disabled:cursor-not-allowed disabled:opacity-50";
