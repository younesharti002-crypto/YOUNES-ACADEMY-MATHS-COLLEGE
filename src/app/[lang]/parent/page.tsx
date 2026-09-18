import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import {
  academyAttendance,
  academyHomework,
  academyHomeworkCorrections,
  academyHomeworkSubmissions,
} from "@/db/academy-operations-schema";
import { academyRooms, academyWeeklySessions } from "@/db/academy-management-schema";
import {
  groups,
  levels,
  parentProfiles,
  parentStudents,
  studentProfiles,
  streams,
  subjects,
  users,
} from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

const DAY_LABELS = {
  MONDAY: { ar: "الإثنين", fr: "Lundi" },
  TUESDAY: { ar: "الثلاثاء", fr: "Mardi" },
  WEDNESDAY: { ar: "الأربعاء", fr: "Mercredi" },
  THURSDAY: { ar: "الخميس", fr: "Jeudi" },
  FRIDAY: { ar: "الجمعة", fr: "Vendredi" },
  SATURDAY: { ar: "السبت", fr: "Samedi" },
} as const;

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default async function ParentDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token
    ? await getAuthenticatedSession(token).catch(() => null)
    : null;

  if (!session || session.user.role !== "PARENT") {
    redirect(`/${lang}/login`);
  }

  const [parent] = await db
    .select({ id: parentProfiles.id })
    .from(parentProfiles)
    .where(eq(parentProfiles.userId, session.user.id))
    .limit(1);

  if (!parent) {
    return <MissingProfile locale={lang} parentName={session.user.fullName} />;
  }

  const children = await db
    .select({
      profileId: studentProfiles.id,
      userId: users.id,
      fullName: users.fullName,
      phone: users.phone,
      studentCode: studentProfiles.studentCode,
      levelName: levels.name,
      streamName: streams.name,
      groupId: groups.id,
      groupName: groups.name,
      relationship: parentStudents.relationship,
    })
    .from(parentStudents)
    .innerJoin(studentProfiles, eq(parentStudents.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .innerJoin(levels, eq(studentProfiles.levelId, levels.id))
    .leftJoin(streams, eq(studentProfiles.streamId, streams.id))
    .leftJoin(groups, eq(studentProfiles.primaryGroupId, groups.id))
    .where(eq(parentStudents.parentId, parent.id))
    .orderBy(asc(users.fullName));

  const childCards = await Promise.all(
    children.map(async (child) => {
      const [access, schedule, attendance, homework] = await Promise.all([
        getStudentSubscriptionAccess(child.userId).catch(() => ({ state: "NONE" as const })),
        child.groupId
          ? db
              .select({
                id: academyWeeklySessions.id,
                day: academyWeeklySessions.day,
                startsAt: academyWeeklySessions.startsAt,
                endsAt: academyWeeklySessions.endsAt,
                subjectName: subjects.name,
                roomName: academyRooms.name,
              })
              .from(academyWeeklySessions)
              .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
              .innerJoin(academyRooms, eq(academyWeeklySessions.roomId, academyRooms.id))
              .where(
                and(
                  eq(academyWeeklySessions.groupId, child.groupId),
                  eq(academyWeeklySessions.status, "PLANNED"),
                ),
              )
          : Promise.resolve([]),
        db
          .select({
            id: academyAttendance.id,
            sessionDate: academyAttendance.sessionDate,
            status: academyAttendance.status,
            note: academyAttendance.note,
            subjectName: subjects.name,
          })
          .from(academyAttendance)
          .innerJoin(
            academyWeeklySessions,
            eq(academyAttendance.weeklySessionId, academyWeeklySessions.id),
          )
          .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
          .where(eq(academyAttendance.studentProfileId, child.profileId))
          .orderBy(
            desc(academyAttendance.sessionDate),
            desc(academyAttendance.markedAt),
          )
          .limit(12),
        child.groupId
          ? db
              .select({
                id: academyHomework.id,
                title: academyHomework.title,
                subjectName: subjects.name,
                dueAt: academyHomework.dueAt,
                submissionStatus: academyHomeworkSubmissions.status,
                score: academyHomeworkCorrections.score,
                scoreMax: academyHomeworkCorrections.scoreMax,
                comment: academyHomeworkCorrections.comment,
              })
              .from(academyHomework)
              .innerJoin(subjects, eq(academyHomework.subjectId, subjects.id))
              .leftJoin(
                academyHomeworkSubmissions,
                and(
                  eq(academyHomeworkSubmissions.homeworkId, academyHomework.id),
                  eq(academyHomeworkSubmissions.studentProfileId, child.profileId),
                ),
              )
              .leftJoin(
                academyHomeworkCorrections,
                eq(academyHomeworkCorrections.submissionId, academyHomeworkSubmissions.id),
              )
              .where(eq(academyHomework.groupId, child.groupId))
              .orderBy(desc(academyHomework.createdAt))
              .limit(12)
          : Promise.resolve([]),
      ]);

      const sortedSchedule = [...schedule].sort((a, b) => {
        const dayA = DAY_ORDER.indexOf(a.day);
        const dayB = DAY_ORDER.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return a.startsAt.localeCompare(b.startsAt);
      });

      return { child, access, schedule: sortedSchedule, attendance, homework };
    }),
  );

  const rtl = lang === "ar";

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
            PARENT SPACE
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            {rtl ? `مرحبا ${session.user.fullName}` : `Bonjour ${session.user.fullName}`}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim">
            {rtl
              ? "من هنا تتابع أبناءك المسجلين في Academy. حالياً يظهر المستوى، المجموعة، الاشتراك والتخطيط الأسبوعي."
              : "Suivez ici vos enfants inscrits à Academy. Cette première version affiche le niveau, le groupe, l’abonnement et le planning hebdomadaire."}
          </p>
        </header>

        {childCards.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.06] p-8 text-center">
            <h2 className="text-xl font-black text-amber-200">
              {rtl ? "لا يوجد تلميذ مرتبط بهذا الحساب" : "Aucun élève lié à ce compte"}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-amber-50/60">
              {rtl
                ? "الإدارة خاصها تربط حساب ولي الأمر بالتلميذ من صفحة Profs & Parents."
                : "L’administration doit relier ce parent à l’élève depuis la page Profs & Parents."}
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {childCards.map(({ child, access, schedule, attendance, homework }) => (
              <section
                key={child.profileId}
                className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]"
              >
                <div className="grid gap-5 border-b border-white/10 p-6 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-2xl font-black">{child.fullName}</p>
                    <p className="mt-1 text-sm text-white/45">
                      {child.studentCode} · {child.levelName}
                      {child.streamName ? ` · ${child.streamName}` : ""}
                      {child.groupName ? ` · ${child.groupName}` : ""}
                    </p>
                    {child.relationship && (
                      <p className="mt-2 text-xs font-bold text-accent/70">
                        {rtl ? "الصفة" : "Lien"}: {child.relationship}
                      </p>
                    )}
                  </div>
                  <SubscriptionBadge state={access.state} rtl={rtl} />
                </div>

                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-black">
                      {rtl ? "التخطيط الأسبوعي" : "Planning hebdomadaire"}
                    </h2>
                    <span className="text-xs text-white/35">
                      {schedule.length} {rtl ? "حصص" : "séances"}
                    </span>
                  </div>

                  {schedule.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
                      {rtl
                        ? "المجموعة غير مرتبطة بعد بالتخطيط الجديد."
                        : "Le groupe n’est pas encore relié au nouveau planning."}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {schedule.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-accent/15 bg-accent/[0.06] p-4"
                        >
                          <p className="text-xs font-black text-accent">
                            {DAY_LABELS[item.day][lang]}
                          </p>
                          <p className="mt-2 font-black">{item.subjectName}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {item.startsAt.slice(0, 5)}–{item.endsAt.slice(0, 5)} · {item.roomName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-black">
                      {rtl ? "آخر سجلات الحضور" : "Dernières présences"}
                    </h2>
                    <span className="text-xs text-white/35">
                      {attendance.length} {rtl ? "سجل" : "enregistrements"}
                    </span>
                  </div>

                  {attendance.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
                      {rtl
                        ? "مازال ما تسجل حتى حضور لهذا التلميذ."
                        : "Aucune présence n’a encore été enregistrée pour cet élève."}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {attendance.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-black/10 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black">{item.subjectName}</p>
                            <AttendanceBadge status={item.status} rtl={rtl} />
                          </div>
                          <p className="mt-2 text-xs text-white/45">
                            {item.sessionDate}
                          </p>
                          {item.note && (
                            <p className="mt-2 text-xs leading-6 text-white/55">
                              {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-black">
                      {rtl ? "الواجبات والنتائج" : "Devoirs & résultats"}
                    </h2>
                    <span className="text-xs text-white/35">
                      {homework.length} {rtl ? "واجب" : "devoirs"}
                    </span>
                  </div>

                  {homework.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">
                      {rtl ? "مازال ما كاين حتى واجب." : "Aucun devoir pour le moment."}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {homework.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <p className="text-xs font-black text-accent">{item.subjectName}</p>
                          <p className="mt-1 font-black">{item.title}</p>
                          <p className="mt-2 text-xs text-white/45">
                            {item.submissionStatus ?? (rtl ? "لم يرسل بعد" : "À faire")}
                          </p>
                          {item.score !== null && item.score !== undefined && (
                            <p className="mt-2 text-sm font-black text-emerald-300">
                              {item.score}/{item.scoreMax ?? "—"}
                            </p>
                          )}
                          {item.comment && (
                            <p className="mt-2 text-xs leading-6 text-white/55">{item.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-8 flex justify-end">
          <Link
            href={`/${lang}/dashboard`}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/60 hover:bg-white/5"
          >
            {rtl ? "تحديث المساحة" : "Actualiser l’espace"}
          </Link>
        </footer>
      </div>
    </main>
  );
}

function AttendanceBadge({
  status,
  rtl,
}: {
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  rtl: boolean;
}) {
  const labels = {
    PRESENT: rtl ? "حاضر" : "Présent",
    ABSENT: rtl ? "غائب" : "Absent",
    LATE: rtl ? "متأخر" : "Retard",
    EXCUSED: rtl ? "مبرر" : "Excusé",
  };

  const styles = {
    PRESENT: "border-emerald-300/20 bg-emerald-300/10 text-emerald-300",
    ABSENT: "border-red-300/20 bg-red-300/10 text-red-300",
    LATE: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    EXCUSED: "border-sky-300/20 bg-sky-300/10 text-sky-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SubscriptionBadge({
  state,
  rtl,
}: {
  state: string;
  rtl: boolean;
}) {
  const active = state === "ACTIVE";
  const label = active
    ? rtl
      ? "الاشتراك مفعل"
      : "Abonnement actif"
    : state === "PENDING"
      ? rtl
        ? "في انتظار التفعيل"
        : "Activation en attente"
      : state === "SUSPENDED"
        ? rtl
          ? "الاشتراك موقوف"
          : "Abonnement suspendu"
        : state === "EXPIRED"
          ? rtl
            ? "الاشتراك منتهي"
            : "Abonnement expiré"
          : rtl
            ? "لا يوجد اشتراك"
            : "Aucun abonnement";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ${
        active
          ? "border border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
          : "border border-amber-300/20 bg-amber-300/10 text-amber-200"
      }`}
    >
      {label}
    </span>
  );
}

function MissingProfile({
  locale,
  parentName,
}: {
  locale: "ar" | "fr";
  parentName: string;
}) {
  const rtl = locale === "ar";
  return (
    <main
      className="grid min-h-screen place-items-center bg-board-900 px-4 text-chalk"
      dir={rtl ? "rtl" : "ltr"}
    >
      <section className="w-full max-w-2xl rounded-[2rem] border border-red-300/20 bg-red-300/[0.06] p-8 text-center">
        <h1 className="text-2xl font-black">{parentName}</h1>
        <p className="mt-3 text-sm leading-7 text-white/55">
          {rtl
            ? "الحساب موجود ولكن ملف ولي الأمر غير مكتمل. تواصل مع الإدارة."
            : "Le compte existe mais le profil parent est incomplet. Contactez l’administration."}
        </p>
      </section>
    </main>
  );
}
