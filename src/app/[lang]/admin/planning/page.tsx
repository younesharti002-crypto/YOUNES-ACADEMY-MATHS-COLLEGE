import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { academyRooms, academyWeeklySessions } from "@/db/academy-management-schema";
import { groups, subjects, users } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const DAYS = [
  { key: "MONDAY", ar: "الإثنين", fr: "Lundi" },
  { key: "TUESDAY", ar: "الثلاثاء", fr: "Mardi" },
  { key: "WEDNESDAY", ar: "الأربعاء", fr: "Mercredi" },
  { key: "THURSDAY", ar: "الخميس", fr: "Jeudi" },
  { key: "FRIDAY", ar: "الجمعة", fr: "Vendredi" },
  { key: "SATURDAY", ar: "السبت", fr: "Samedi" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

export default async function AcademyPlanningPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  const rows = await db
    .select({
      id: academyWeeklySessions.id,
      groupName: groups.name,
      subjectName: subjects.name,
      roomName: academyRooms.name,
      teacherName: users.fullName,
      day: academyWeeklySessions.day,
      startsAt: academyWeeklySessions.startsAt,
      endsAt: academyWeeklySessions.endsAt,
      status: academyWeeklySessions.status,
    })
    .from(academyWeeklySessions)
    .innerJoin(groups, eq(academyWeeklySessions.groupId, groups.id))
    .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
    .innerJoin(academyRooms, eq(academyWeeklySessions.roomId, academyRooms.id))
    .leftJoin(users, eq(academyWeeklySessions.teacherUserId, users.id))
    .orderBy(
      asc(academyWeeklySessions.startsAt),
      asc(academyRooms.name),
      asc(academyWeeklySessions.day),
    );

  const rtl = lang === "ar";
  const dayIndex = new Map(DAYS.map((day, index) => [day.key, index]));
  const sortedRows = [...rows].sort((a, b) => {
    const time = a.startsAt.localeCompare(b.startsAt);
    if (time !== 0) return time;
    const room = a.roomName.localeCompare(b.roomName);
    if (room !== 0) return room;
    return (dayIndex.get(a.day as DayKey) ?? 99) - (dayIndex.get(b.day as DayKey) ?? 99);
  });

  const slots = Array.from(
    new Map(
      sortedRows.map((row) => [
        `${row.roomName}|${row.startsAt}|${row.endsAt}`,
        { roomName: row.roomName, startsAt: row.startsAt, endsAt: row.endsAt },
      ]),
    ).values(),
  );

  const sessionMap = new Map(
    sortedRows.map((row) => [
      `${row.roomName}|${row.startsAt}|${row.endsAt}|${row.day}`,
      row,
    ]),
  );

  const total = rows.length;
  const unassigned = rows.filter((row) => !row.teacherName).length;
  const capacity = 72;
  const occupancy = Math.round((total / capacity) * 1000) / 10;

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-[96rem]">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
              PLANNING LIVE · NEON
            </span>
            <h1 className="mt-4 text-3xl font-black">
              {rtl ? "التخطيط الأسبوعي للأكاديمية" : "Planning hebdomadaire Academy"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-chalk-dim">
              {rtl
                ? "هذه الصفحة تقرأ الحصص مباشرة من قاعدة البيانات. أسماء الأساتذة تبقى غير معينة حتى انتهاء التوظيف."
                : "Cette page lit les séances directement depuis la base. Les professeurs restent non affectés jusqu’au recrutement."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${lang}/admin`}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/5"
            >
              {rtl ? "لوحة Academy" : "Dashboard Academy"}
            </Link>
            <Link
              href={`/${lang}/admin/academic`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-black text-board-900 hover:bg-accent-soft"
            >
              {rtl ? "الإدارة الأكاديمية" : "Gestion académique"}
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric value={String(total)} label={rtl ? "حصة مبرمجة" : "Séances planifiées"} />
          <Metric value={`${occupancy}%`} label={rtl ? "استغلال القاعات" : "Occupation"} />
          <Metric value={String(capacity - total)} label={rtl ? "حصة متاحة" : "Créneaux libres"} />
          <Metric value={String(unassigned)} label={rtl ? "حصة بلا أستاذ" : "Séances sans prof"} warning />
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.055] text-white/70">
                  <th className="sticky start-0 z-10 min-w-56 border-b border-e border-white/10 bg-board-800 px-4 py-4 text-start font-black">
                    {rtl ? "القاعة / التوقيت" : "Salle / créneau"}
                  </th>
                  {DAYS.map((day) => (
                    <th key={day.key} className="min-w-40 border-b border-white/10 px-3 py-4 text-center font-black">
                      {day[lang]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={`${slot.roomName}-${slot.startsAt}`} className="align-top">
                    <th className="sticky start-0 z-10 border-b border-e border-white/10 bg-board-900 px-4 py-4 text-start">
                      <p className="font-black">{slot.roomName}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {shortTime(slot.startsAt)}–{shortTime(slot.endsAt)}
                      </p>
                    </th>
                    {DAYS.map((day) => {
                      const row = sessionMap.get(
                        `${slot.roomName}|${slot.startsAt}|${slot.endsAt}|${day.key}`,
                      );
                      return (
                        <td key={day.key} className="border-b border-white/10 p-2">
                          {row ? (
                            <div className="min-h-24 rounded-2xl border border-accent/15 bg-accent/[0.065] p-3">
                              <p className="font-black text-chalk">{row.groupName}</p>
                              <p className="mt-1 text-xs font-bold text-accent-soft">
                                {shortSubject(row.subjectName)}
                              </p>
                              <p className="mt-3 text-[11px] text-amber-200/80">
                                {row.teacherName ??
                                  (rtl ? "الأستاذ: غير معيّن" : "Prof : à affecter")}
                              </p>
                            </div>
                          ) : (
                            <div className="min-h-24 rounded-2xl border border-dashed border-white/8 p-3 text-center text-xs text-white/20">
                              {rtl ? "متاح" : "Libre"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-4 text-xs text-white/35">
          {rtl
            ? "المصدر: academy_weekly_sessions في Neon Production."
            : "Source : academy_weekly_sessions dans Neon Production."}
        </p>
      </div>
    </main>
  );
}

function Metric({
  value,
  label,
  warning = false,
}: {
  value: string;
  label: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className={`text-3xl font-black ${warning ? "text-amber-200" : "text-accent"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs font-bold text-white/50">{label}</p>
    </div>
  );
}

function shortTime(value: string) {
  return value.slice(0, 5);
}

function shortSubject(value: string) {
  const labels: Record<string, string> = {
    "Mathématiques": "MATH",
    "Physique-Chimie": "PC",
    "Histoire-Géographie": "HG",
    "Économie générale": "ECO GÉN",
    "Comptabilité": "COMPTA",
  };
  return labels[value] ?? value.toUpperCase();
}
