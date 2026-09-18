"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type FileMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Assignment = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  createdAt: string;
  groupName: string;
  subjectName: string;
  submissionId: string | null;
  submissionStatus: "SUBMITTED" | "IN_REVIEW" | "CORRECTED" | null;
  submittedAt: string | null;
  studentComment: string | null;
  score: string | null;
  scoreMax: string | null;
  correctionComment: string | null;
  correctedAt: string | null;
  files: FileMeta[];
};

const inputClass =
  "w-full rounded-xl border border-[#ddd8ce] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#b48b27]";

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

export function StudentHomeworkClient({
  locale,
  studentName,
}: {
  locale: "ar" | "fr";
  studentName: string;
}) {
  const rtl = locale === "ar";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("/api/v1/homework/assignments");
      setAssignments(payload.data.assignments as Assignment[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitHomework(
    event: FormEvent<HTMLFormElement>,
    assignmentId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const files = fd
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length < 1 || files.length > 3) {
      setMessage(
        rtl
          ? "اختَر من ملف واحد حتى 3 ملفات."
          : "Choisissez entre 1 et 3 fichiers.",
      );
      return;
    }

    setBusyId(assignmentId);
    setMessage("");

    try {
      const upload = new FormData();
      upload.set("assignmentId", assignmentId);
      upload.set("comment", String(fd.get("comment") ?? ""));
      for (const file of files) upload.append("files", file);

      await api("/api/v1/homework/submit", {
        method: "POST",
        body: upload,
      });

      form.reset();
      setMessage(
        rtl
          ? "تم إرسال الواجب للأستاذ بنجاح."
          : "Devoir envoyé au professeur.",
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(rtl ? "ar-MA" : "fr-MA", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : rtl
        ? "بدون أجل محدد"
        : "Sans date limite";

  return (
    <main
      className="min-h-screen bg-[#f3f1ec] px-4 py-6 text-[#111827] sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] bg-board-900 p-6 text-chalk shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                HOMEWORK
              </span>
              <h1 className="mt-4 text-3xl font-black">
                {rtl ? "واجباتي" : "Mes devoirs"}
              </h1>
              <p className="mt-2 text-sm text-chalk-dim">{studentName}</p>
            </div>
            <Link
              href={`/${locale}/dashboard`}
              className="w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/5"
            >
              {rtl ? "الرجوع للرئيسية" : "Retour au tableau de bord"}
            </Link>
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-2xl border border-[#d8c58e] bg-[#fff9e8] px-4 py-3 text-sm font-semibold text-[#7a5d15]">
            {message}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-8 text-center text-sm text-[#77736b]">
            {rtl ? "جاري تحميل الواجبات..." : "Chargement des devoirs..."}
          </p>
        ) : assignments.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-[#e2ded5] bg-white p-8 text-center">
            <h2 className="text-xl font-black">
              {rtl ? "لا يوجد واجب حالياً" : "Aucun devoir pour le moment"}
            </h2>
            <p className="mt-2 text-sm text-[#77736b]">
              {rtl
                ? "الواجبات اللي ينشرها الأستاذ غادي يبانوا هنا."
                : "Les devoirs publiés par le professeur apparaîtront ici."}
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {assignments.map((assignment) => {
              const corrected = assignment.submissionStatus === "CORRECTED";
              return (
                <article
                  key={assignment.id}
                  className="overflow-hidden rounded-[2rem] border border-[#e2ded5] bg-white shadow-[0_12px_32px_rgba(20,24,32,0.05)]"
                >
                  <div className="border-b border-[#eeeae3] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9a741d]">
                          {assignment.subjectName} · {assignment.groupName}
                        </p>
                        <h2 className="mt-2 text-xl font-black sm:text-2xl">
                          {assignment.title}
                        </h2>
                        {assignment.instructions ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#615e58]">
                            {assignment.instructions}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs font-bold text-[#8a867e]">
                          {rtl ? "آخر أجل" : "Échéance"}:{" "}
                          {formatDate(assignment.dueAt)}
                        </p>
                      </div>
                      <StatusBadge
                        status={assignment.submissionStatus}
                        rtl={rtl}
                      />
                    </div>
                  </div>

                  {assignment.submissionId ? (
                    <div className="border-b border-[#eeeae3] bg-[#faf9f6] p-5 sm:p-6">
                      <p className="text-sm font-black">
                        {rtl ? "الإرسال الحالي" : "Envoi actuel"}
                      </p>
                      <p className="mt-1 text-xs text-[#77736b]">
                        {assignment.submittedAt
                          ? formatDate(assignment.submittedAt)
                          : ""}
                      </p>
                      {assignment.studentComment ? (
                        <p className="mt-3 text-sm text-[#5f5b55]">
                          {assignment.studentComment}
                        </p>
                      ) : null}

                      {assignment.files.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignment.files.map((file) => (
                            <a
                              key={file.id}
                              href={`/api/v1/homework/files/${file.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#ddd8ce] bg-white px-3 py-1.5 text-xs font-bold text-[#6f5b27] hover:border-[#b48b27]"
                            >
                              {file.fileName} · {formatBytes(file.sizeBytes)}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {corrected ? (
                    <div className="p-5 sm:p-6">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-black text-emerald-900">
                            {rtl ? "تصحيح الأستاذ" : "Correction du professeur"}
                          </h3>
                          {assignment.score !== null ? (
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-800">
                              {assignment.score}
                              {assignment.scoreMax
                                ? ` / ${assignment.scoreMax}`
                                : ""}
                            </span>
                          ) : null}
                        </div>
                        {assignment.correctionComment ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-900/75">
                            {assignment.correctionComment}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <form
                      className="space-y-4 p-5 sm:p-6"
                      onSubmit={(event) =>
                        void submitHomework(event, assignment.id)
                      }
                    >
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-[#6d6962]">
                          {rtl
                            ? "صور الجواب أو PDF (1 حتى 3 ملفات، 5MB لكل ملف)"
                            : "Photos ou PDF (1 à 3 fichiers, 5 Mo par fichier)"}
                        </span>
                        <input
                          name="files"
                          type="file"
                          multiple
                          required
                          accept="image/jpeg,image/png,application/pdf"
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-[#6d6962]">
                          {rtl ? "ملاحظة للأستاذ (اختيارية)" : "Note au professeur (facultatif)"}
                        </span>
                        <textarea
                          name="comment"
                          maxLength={2000}
                          rows={3}
                          className={inputClass}
                        />
                      </label>

                      <button
                        disabled={busyId === assignment.id}
                        className="rounded-xl bg-board-900 px-5 py-3 text-sm font-black text-accent hover:bg-board-800 disabled:opacity-50"
                      >
                        {busyId === assignment.id
                          ? rtl
                            ? "جاري الإرسال..."
                            : "Envoi..."
                          : assignment.submissionId
                            ? rtl
                              ? "إعادة إرسال الجواب"
                              : "Remplacer l’envoi"
                            : rtl
                              ? "إرسال الواجب"
                              : "Envoyer le devoir"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({
  status,
  rtl,
}: {
  status: Assignment["submissionStatus"];
  rtl: boolean;
}) {
  if (!status) {
    return (
      <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">
        {rtl ? "مطلوب" : "À faire"}
      </span>
    );
  }

  const labels = {
    SUBMITTED: rtl ? "تم الإرسال" : "Envoyé",
    IN_REVIEW: rtl ? "قيد التصحيح" : "En correction",
    CORRECTED: rtl ? "تم التصحيح" : "Corrigé",
  };

  const styles = {
    SUBMITTED: "border-sky-200 bg-sky-50 text-sky-800",
    IN_REVIEW: "border-violet-200 bg-violet-50 text-violet-800",
    CORRECTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
