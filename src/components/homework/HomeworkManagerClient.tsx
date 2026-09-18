"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Scope = {
  groupId: string;
  groupName: string;
  subjectId: string;
  subjectName: string;
};

type Assignment = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  published: boolean;
  groupId: string;
  groupName: string;
  subjectId: string;
  subjectName: string;
  teacherUserId: string | null;
  createdAt: string;
};

type FileMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Submission = {
  id: string;
  studentProfileId: string;
  studentName: string;
  studentCode: string;
  status: "SUBMITTED" | "IN_REVIEW" | "CORRECTED";
  studentComment: string | null;
  submittedAt: string;
  score: string | null;
  scoreMax: string | null;
  correctionComment: string | null;
  correctedAt: string | null;
  files: FileMeta[];
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/70";

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

export function HomeworkManagerClient({
  locale,
  role,
  staffName,
}: {
  locale: "ar" | "fr";
  role: "ADMIN" | "TEACHER";
  staffName: string;
}) {
  const rtl = locale === "ar";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAssignment = useMemo(
    () => assignments.find((row) => row.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  const refreshAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("/api/v1/homework/assignments");
      setAssignments(payload.data.assignments as Assignment[]);
      setScopes(payload.data.scopes as Scope[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAssignments();
  }, [refreshAssignments]);

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const scopeValue = String(fd.get("scope") ?? "");
    const [groupId, subjectId] = scopeValue.split("|");
    if (!groupId || !subjectId) return;

    const dueLocal = String(fd.get("dueAt") ?? "");
    const dueAt = dueLocal ? new Date(dueLocal).toISOString() : null;

    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/homework/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          subjectId,
          title: fd.get("title"),
          instructions: fd.get("instructions"),
          dueAt,
          published: true,
        }),
      });
      form.reset();
      setMessage(
        rtl ? "تم نشر الواجب بنجاح." : "Devoir publié avec succès.",
      );
      await refreshAssignments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadSubmissions(assignmentId: string) {
    setSelectedId(assignmentId);
    setSubmissionsLoading(true);
    setMessage("");
    try {
      const payload = await api(
        `/api/v1/homework/submissions?assignmentId=${encodeURIComponent(assignmentId)}`,
      );
      setSubmissions(payload.data.submissions as Submission[]);
    } catch (error) {
      setSubmissions([]);
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function correctSubmission(
    event: FormEvent<HTMLFormElement>,
    submissionId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/homework/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          score: fd.get("score"),
          scoreMax: fd.get("scoreMax"),
          comment: fd.get("comment"),
        }),
      });
      setMessage(
        rtl ? "تم حفظ التصحيح والنقطة." : "Correction enregistrée.",
      );
      if (selectedId) await loadSubmissions(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Correction failed");
    } finally {
      setBusy(false);
    }
  }

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(rtl ? "ar-MA" : "fr-MA", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : rtl
        ? "بدون أجل"
        : "Sans échéance";

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                HOMEWORK · {role}
              </span>
              <h1 className="mt-4 text-3xl font-black">
                {rtl ? "الواجبات والتصحيح" : "Devoirs & corrections"}
              </h1>
              <p className="mt-2 text-sm text-chalk-dim">{staffName}</p>
            </div>
            <Link
              href={role === "ADMIN" ? `/${locale}/admin` : `/${locale}/studio`}
              className="w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/5"
            >
              {rtl ? "رجوع" : "Retour"}
            </Link>
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-2xl border border-accent/15 bg-accent/[0.06] px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-xl font-black">
              {rtl ? "إنشاء واجب" : "Créer un devoir"}
            </h2>

            {scopes.length === 0 && !loading ? (
              <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100/70">
                {role === "TEACHER"
                  ? rtl
                    ? "خاص الإدارة تعيّنك أولاً فـPlanning ديال مادة ومجموعة."
                    : "L’administration doit d’abord vous affecter à une matière/groupe."
                  : rtl
                    ? "ما كايناش حصص مبرمجة."
                    : "Aucune séance planifiée."}
              </p>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={(event) => void createAssignment(event)}>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "المجموعة والمادة" : "Groupe & matière"}
                  </span>
                  <select name="scope" required className={inputClass} defaultValue="">
                    <option value="" disabled>
                      {rtl ? "اختر" : "Choisir"}
                    </option>
                    {scopes.map((scope) => (
                      <option
                        key={`${scope.groupId}-${scope.subjectId}`}
                        value={`${scope.groupId}|${scope.subjectId}`}
                      >
                        {scope.groupName} · {scope.subjectName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "عنوان الواجب" : "Titre"}
                  </span>
                  <input name="title" required maxLength={220} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "التعليمات" : "Consignes"}
                  </span>
                  <textarea name="instructions" maxLength={5000} rows={5} className={inputClass} />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "آخر أجل" : "Date limite"}
                  </span>
                  <input name="dueAt" type="datetime-local" className={inputClass} />
                </label>

                <button
                  disabled={busy || scopes.length === 0}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-black text-board-900 hover:bg-accent-soft disabled:opacity-50"
                >
                  {rtl ? "نشر الواجب" : "Publier le devoir"}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">
                {rtl ? "الواجبات المنشورة" : "Devoirs publiés"}
              </h2>
              <span className="text-xs text-white/35">{assignments.length}</span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-white/40">
                {rtl ? "جاري التحميل..." : "Chargement..."}
              </p>
            ) : assignments.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">
                {rtl ? "مازال ما تنشر حتى واجب." : "Aucun devoir publié."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => void loadSubmissions(assignment.id)}
                    className={`w-full rounded-2xl border p-4 text-start transition ${
                      selectedId === assignment.id
                        ? "border-accent/45 bg-accent/[0.08]"
                        : "border-white/10 bg-black/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-black">{assignment.title}</p>
                    <p className="mt-1 text-xs text-accent/80">
                      {assignment.groupName} · {assignment.subjectName}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      {rtl ? "آخر أجل" : "Échéance"}: {formatDate(assignment.dueAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {selectedAssignment ? (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black text-accent">
                  {selectedAssignment.groupName} · {selectedAssignment.subjectName}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {selectedAssignment.title}
                </h2>
              </div>
              <span className="text-xs text-white/40">
                {submissions.length} {rtl ? "إرسال" : "envoi(s)"}
              </span>
            </div>

            {submissionsLoading ? (
              <p className="mt-5 text-sm text-white/40">
                {rtl ? "جاري تحميل الأجوبة..." : "Chargement des réponses..."}
              </p>
            ) : submissions.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/40">
                {rtl ? "مازال حتى تلميذ ما صيفط الجواب." : "Aucun élève n’a encore envoyé sa réponse."}
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {submissions.map((submission) => (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black">{submission.studentName}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {submission.studentCode} · {formatDate(submission.submittedAt)}
                        </p>
                      </div>
                      <SubmissionBadge status={submission.status} rtl={rtl} />
                    </div>

                    {submission.studentComment ? (
                      <p className="mt-3 text-sm leading-7 text-white/60">
                        {submission.studentComment}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {submission.files.map((file) => (
                        <a
                          key={file.id}
                          href={`/api/v1/homework/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-accent/15 bg-accent/[0.06] px-3 py-1.5 text-xs font-bold text-accent-soft hover:border-accent/35"
                        >
                          {file.fileName} · {formatBytes(file.sizeBytes)}
                        </a>
                      ))}
                    </div>

                    <form
                      className="mt-4 grid gap-3 lg:grid-cols-[0.35fr_0.35fr_1fr_auto]"
                      onSubmit={(event) => void correctSubmission(event, submission.id)}
                    >
                      <input
                        name="score"
                        type="number"
                        min="0"
                        step="0.25"
                        defaultValue={submission.score ?? ""}
                        className={inputClass}
                        placeholder={rtl ? "النقطة" : "Note"}
                      />
                      <input
                        name="scoreMax"
                        type="number"
                        min="0.25"
                        step="0.25"
                        defaultValue={submission.scoreMax ?? "20"}
                        className={inputClass}
                        placeholder="/20"
                      />
                      <input
                        name="comment"
                        maxLength={4000}
                        defaultValue={submission.correctionComment ?? ""}
                        className={inputClass}
                        placeholder={rtl ? "تعليق التصحيح" : "Commentaire"}
                      />
                      <button
                        disabled={busy}
                        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-board-900 hover:bg-accent-soft disabled:opacity-50"
                      >
                        {rtl ? "حفظ التصحيح" : "Corriger"}
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SubmissionBadge({
  status,
  rtl,
}: {
  status: Submission["status"];
  rtl: boolean;
}) {
  const label =
    status === "CORRECTED"
      ? rtl
        ? "مصحح"
        : "Corrigé"
      : status === "IN_REVIEW"
        ? rtl
          ? "قيد التصحيح"
          : "En correction"
        : rtl
          ? "مرسل"
          : "Envoyé";

  return (
    <span className="w-fit rounded-full border border-accent/15 bg-accent/[0.06] px-3 py-1 text-xs font-black text-accent-soft">
      {label}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
