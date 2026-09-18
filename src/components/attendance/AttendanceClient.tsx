"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type Session = {
  id: string;
  groupId: string;
  teacherUserId: string | null;
  day: string;
  startsAt: string;
  endsAt: string;
  groupName: string;
  subjectName: string;
  roomName: string;
};

type Student = {
  profileId: string;
  fullName: string;
  studentCode: string;
  phone: string;
};

type ExistingRecord = {
  id: string;
  studentProfileId: string;
  status: AttendanceStatus;
  note: string | null;
  markedAt: string;
};

type RosterState = Record<
  string,
  {
    status: AttendanceStatus;
    note: string;
  }
>;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/70";

const statusOptions: Array<{
  value: AttendanceStatus;
  ar: string;
  fr: string;
}> = [
  { value: "PRESENT", ar: "حاضر", fr: "Présent" },
  { value: "ABSENT", ar: "غائب", fr: "Absent" },
  { value: "LATE", ar: "متأخر", fr: "Retard" },
  { value: "EXCUSED", ar: "مبرر", fr: "Excusé" },
];

const dayLabels: Record<string, { ar: string; fr: string }> = {
  MONDAY: { ar: "الإثنين", fr: "Lundi" },
  TUESDAY: { ar: "الثلاثاء", fr: "Mardi" },
  WEDNESDAY: { ar: "الأربعاء", fr: "Mercredi" },
  THURSDAY: { ar: "الخميس", fr: "Jeudi" },
  FRIDAY: { ar: "الجمعة", fr: "Vendredi" },
  SATURDAY: { ar: "السبت", fr: "Samedi" },
};

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

function todayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AttendanceClient({
  locale,
  role,
  staffName,
}: {
  locale: "ar" | "fr";
  role: "ADMIN" | "TEACHER";
  staffName: string;
}) {
  const rtl = locale === "ar";
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [students, setStudents] = useState<Student[]>([]);
  const [roster, setRoster] = useState<RosterState>({});
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("/api/v1/attendance");
      const rows = payload.data.sessions as Session[];
      setSessions(rows);
      if (rows.length > 0) setSessionId((current) => current || rows[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function loadRoster() {
    if (!sessionId || !date) return;
    setRosterLoading(true);
    setMessage("");
    try {
      const payload = await api(
        `/api/v1/attendance?weeklySessionId=${encodeURIComponent(sessionId)}&date=${encodeURIComponent(date)}`,
      );
      const nextStudents = payload.data.students as Student[];
      const records = payload.data.records as ExistingRecord[];
      const byStudent = new Map(records.map((record) => [record.studentProfileId, record]));

      const nextRoster: RosterState = {};
      for (const student of nextStudents) {
        const record = byStudent.get(student.profileId);
        nextRoster[student.profileId] = {
          status: record?.status ?? "PRESENT",
          note: record?.note ?? "",
        };
      }

      setStudents(nextStudents);
      setRoster(nextRoster);
      setMessage(
        nextStudents.length === 0
          ? rtl
            ? "لا يوجد تلاميذ في هذه المجموعة."
            : "Aucun élève dans ce groupe."
          : "",
      );
    } catch (error) {
      setStudents([]);
      setRoster({});
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setRosterLoading(false);
    }
  }

  function setAll(status: AttendanceStatus) {
    setRoster((current) => {
      const next = { ...current };
      for (const student of students) {
        next[student.profileId] = {
          ...(next[student.profileId] ?? { note: "" }),
          status,
        };
      }
      return next;
    });
  }

  async function saveAttendance() {
    if (!sessionId || !date || students.length === 0) return;
    setSaving(true);
    setMessage("");
    try {
      const records = students.map((student) => ({
        studentProfileId: student.profileId,
        status: roster[student.profileId]?.status ?? "PRESENT",
        note: roster[student.profileId]?.note ?? "",
      }));

      const payload = await api("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklySessionId: sessionId,
          date,
          records,
        }),
      });

      setMessage(
        rtl
          ? `تم حفظ حضور ${payload.data.saved} تلميذ.`
          : `Présence enregistrée pour ${payload.data.saved} élève(s).`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                ATTENDANCE · {role}
              </span>
              <h1 className="mt-4 text-3xl font-black">
                {rtl ? "تسجيل الحضور" : "Gestion des présences"}
              </h1>
              <p className="mt-2 text-sm text-chalk-dim">
                {staffName}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={role === "ADMIN" ? `/${locale}/admin` : `/${locale}/studio`}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/5"
              >
                {rtl ? "رجوع" : "Retour"}
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          {loading ? (
            <p className="text-sm text-white/40">
              {rtl ? "جاري تحميل الحصص..." : "Chargement des séances..."}
            </p>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
              <p className="font-black text-amber-200">
                {rtl ? "لا توجد حصص متاحة لهذا الحساب." : "Aucune séance disponible pour ce compte."}
              </p>
              <p className="mt-2 text-sm text-amber-50/55">
                {role === "TEACHER"
                  ? rtl
                    ? "خاص الإدارة تعيّنك أولاً في الـPlanning."
                    : "L’administration doit d’abord vous affecter dans le planning."
                  : rtl
                    ? "الـPlanning فارغ."
                    : "Le planning est vide."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_auto]">
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "الحصة" : "Séance"}
                  </span>
                  <select
                    value={sessionId}
                    onChange={(event) => {
                      setSessionId(event.target.value);
                      setStudents([]);
                      setRoster({});
                    }}
                    className={inputClass}
                  >
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.groupName} · {session.subjectName} ·{" "}
                        {dayLabels[session.day]?.[locale] ?? session.day} ·{" "}
                        {session.startsAt.slice(0, 5)} · {session.roomName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1.5 block text-xs font-bold text-white/55">
                    {rtl ? "التاريخ" : "Date"}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setStudents([]);
                      setRoster({});
                    }}
                    className={inputClass}
                  />
                </label>

                <button
                  type="button"
                  disabled={rosterLoading || !sessionId || !date}
                  onClick={() => void loadRoster()}
                  className="self-end rounded-xl bg-accent px-5 py-2.5 text-sm font-black text-board-900 hover:bg-accent-soft disabled:opacity-50"
                >
                  {rosterLoading
                    ? rtl
                      ? "تحميل..."
                      : "Chargement..."
                    : rtl
                      ? "فتح اللائحة"
                      : "Ouvrir la liste"}
                </button>
              </div>

              {selectedSession && (
                <p className="mt-3 text-xs text-white/35">
                  {selectedSession.groupName} · {selectedSession.subjectName} ·{" "}
                  {dayLabels[selectedSession.day]?.[locale] ?? selectedSession.day}
                </p>
              )}
            </>
          )}
        </section>

        {message && (
          <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/[0.06] px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        )}

        {students.length > 0 && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  {rtl ? "لائحة التلاميذ" : "Liste des élèves"}
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  {students.length} {rtl ? "تلميذ" : "élève(s)"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAll(option.value)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60 hover:bg-white/5"
                  >
                    {rtl ? `الكل ${option.ar}` : `Tous ${option.fr.toLowerCase()}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {students.map((student) => {
                const state = roster[student.profileId] ?? {
                  status: "PRESENT" as AttendanceStatus,
                  note: "",
                };
                return (
                  <div
                    key={student.profileId}
                    className="grid gap-3 rounded-2xl border border-white/8 bg-black/10 p-4 lg:grid-cols-[1fr_0.7fr_1fr]"
                  >
                    <div>
                      <p className="font-black">{student.fullName}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {student.studentCode} · {student.phone}
                      </p>
                    </div>
                    <select
                      value={state.status}
                      onChange={(event) =>
                        setRoster((current) => ({
                          ...current,
                          [student.profileId]: {
                            ...state,
                            status: event.target.value as AttendanceStatus,
                          },
                        }))
                      }
                      className={inputClass}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option[locale]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={state.note}
                      onChange={(event) =>
                        setRoster((current) => ({
                          ...current,
                          [student.profileId]: {
                            ...state,
                            note: event.target.value,
                          },
                        }))
                      }
                      className={inputClass}
                      maxLength={500}
                      placeholder={rtl ? "ملاحظة اختيارية" : "Note facultative"}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAttendance()}
              className="mt-5 rounded-xl bg-accent px-6 py-3 text-sm font-black text-board-900 hover:bg-accent-soft disabled:opacity-50"
            >
              {saving
                ? rtl
                  ? "جاري الحفظ..."
                  : "Enregistrement..."
                : rtl
                  ? "حفظ الحضور"
                  : "Enregistrer la présence"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
