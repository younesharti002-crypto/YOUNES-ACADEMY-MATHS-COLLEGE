import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { pool } from "@/db";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

type TeacherRow = {
  id: string;
  fullName: string;
  phone: string;
  status: "ACTIVE" | "DISABLED";
  preferredLanguage: "ar" | "fr";
  weeklySessions: number;
  lastLoginAt: string | null;
  createdAt: string;
};

type PlanningStats = {
  totalSessions: number;
  assignedSessions: number;
  unassignedSessions: number;
};

type SubjectNeedRow = {
  subjectName: string;
  sessions: number;
  unassigned: number;
};

const DEFAULT_STATS: PlanningStats = {
  totalSessions: 0,
  assignedSessions: 0,
  unassignedSessions: 0,
};

export default async function AdminProfsPage({
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

  const rtl = lang === "ar";
  let teachers: TeacherRow[] = [];
  let stats: PlanningStats = DEFAULT_STATS;
  let subjectNeeds: SubjectNeedRow[] = [];
  let loadError = "";

  try {
    const [teacherResult, statsResult, subjectResult] = await Promise.all([
      pool.query<TeacherRow>(
        `
          SELECT
            users.id::text AS "id",
            users.full_name AS "fullName",
            users.phone AS "phone",
            users.status AS "status",
            users.preferred_language AS "preferredLanguage",
            users.last_login_at AS "lastLoginAt",
            users.created_at AS "createdAt",
            COUNT(academy_weekly_sessions.id)::int AS "weeklySessions"
          FROM users
          LEFT JOIN academy_weekly_sessions
            ON academy_weekly_sessions.teacher_user_id = users.id
           AND academy_weekly_sessions.status <> 'CANCELLED'
          WHERE users.role = 'TEACHER'
          GROUP BY users.id
          ORDER BY users.created_at DESC
        `,
      ),
      pool.query<PlanningStats>(
        `
          SELECT
            COUNT(*)::int AS "totalSessions",
            COUNT(*) FILTER (WHERE teacher_user_id IS NOT NULL)::int AS "assignedSessions",
            COUNT(*) FILTER (WHERE teacher_user_id IS NULL)::int AS "unassignedSessions"
          FROM academy_weekly_sessions
          WHERE status <> 'CANCELLED'
        `,
      ),
      pool.query<SubjectNeedRow>(
        `
          SELECT
            subjects.name AS "subjectName",
            COUNT(academy_weekly_sessions.id)::int AS "sessions",
            COUNT(academy_weekly_sessions.id) FILTER (WHERE academy_weekly_sessions.teacher_user_id IS NULL)::int AS "unassigned"
          FROM academy_weekly_sessions
          INNER JOIN subjects ON subjects.id = academy_weekly_sessions.subject_id
          WHERE academy_weekly_sessions.status <> 'CANCELLED'
          GROUP BY subjects.name
          ORDER BY subjects.name ASC
        `,
      ),
    ]);

    teachers = teacherResult.rows.map((row) => ({
      ...row,
      weeklySessions: Number(row.weeklySessions || 0),
    }));
    stats = statsResult.rows[0] || DEFAULT_STATS;
    subjectNeeds = subjectResult.rows.map((row) => ({
      ...row,
      sessions: Number(row.sessions || 0),
      unassigned: Number(row.unassigned || 0),
    }));
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load professors.";
  }

  const assignedPercent = stats.totalSessions > 0
    ? Math.round((stats.assignedSessions / stats.totalSessions) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10" dir={rtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                PROF CONTROL
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "إدارة الأساتذة" : "Gestion des professeurs"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "هنا كتراقب الأساتذة، الحصص اللي تعينت ليهم، والحصص اللي مازال خاصها أستاذ قبل بداية العمل الحقيقي."
                  : "Suivi des professeurs, séances affectées et séances qui attendent encore un professeur."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/${lang}/admin/people`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft">
                {rtl ? "إنشاء/إدارة أستاذ" : "Créer / gérer prof"}
              </Link>
              <Link href={`/${lang}/admin/planning`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5">
                {rtl ? "ربط الأستاذ بالتخطيط" : "Affecter au planning"}
              </Link>
              <Link href={`/${lang}/admin`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5">
                {rtl ? "رجوع للإدارة" : "Retour admin"}
              </Link>
            </div>
          </div>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[2rem] border border-red-300/20 bg-red-300/[0.07] p-5 text-sm leading-7 text-red-100">
            {rtl ? "تعذر تحميل معطيات الأساتذة: " : "Impossible de charger les données professeurs : "}{loadError}
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric value={String(teachers.length)} label={rtl ? "أستاذ مسجل" : "Professeurs"} />
          <Metric value={String(stats.totalSessions)} label={rtl ? "مجموع الحصص" : "Séances totales"} />
          <Metric value={String(stats.assignedSessions)} label={rtl ? "حصص عندها أستاذ" : "Séances affectées"} />
          <Metric value={`${assignedPercent}%`} label={rtl ? "نسبة التعيين" : "Taux d’affectation"} />
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-amber-200">
                {rtl ? "الحصص التي تحتاج أستاذ" : "Séances sans professeur"}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-50/70">
                {rtl
                  ? `${stats.unassignedSessions} حصة مازال خاصها أستاذ. البداية العملية: أنشئ حساب الأستاذ ثم اربطه بالحصة من التخطيط.`
                  : `${stats.unassignedSessions} séances attendent un professeur. Étape pratique : créer le compte puis l’affecter au planning.`}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-amber-200/25 px-4 py-2 text-xs font-black text-amber-200">
              {stats.unassignedSessions} {rtl ? "غير معينة" : "non affectées"}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/70">Teachers</p>
                <h2 className="mt-1 text-2xl font-black">{rtl ? "لائحة الأساتذة" : "Liste des professeurs"}</h2>
              </div>
              <Link href={`/${lang}/admin/people`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white/70 hover:border-accent/40 hover:text-accent">
                {rtl ? "إضافة" : "Ajouter"}
              </Link>
            </div>

            <div className="space-y-3">
              {teachers.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-chalk-dim">
                  {rtl
                    ? "مازال ما كاين حتى حساب أستاذ. افتح إدارة الأشخاص وأنشئ حساب بدور TEACHER."
                    : "Aucun compte professeur pour le moment. Ouvrez la gestion des personnes et créez un compte TEACHER."}
                </div>
              ) : (
                teachers.map((teacher) => (
                  <article key={teacher.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-accent/25 hover:bg-white/[0.055]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black">{teacher.fullName}</h3>
                        <p className="mt-1 text-xs font-bold text-white/45">{teacher.phone}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${teacher.status === "ACTIVE" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-red-300/30 bg-red-300/10 text-red-200"}`}>
                          {teacher.status}
                        </span>
                        <span className="rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1 text-[11px] font-black text-accent">
                          {teacher.weeklySessions} {rtl ? "حصص" : "séances"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/70">Subjects</p>
              <h2 className="mt-1 text-2xl font-black">{rtl ? "المواد والتعيين" : "Matières & affectation"}</h2>
            </div>

            <div className="space-y-3">
              {subjectNeeds.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-chalk-dim">
                  {rtl ? "مازال ما كايناش حصص فالتخطيط." : "Aucune séance n’est encore créée dans le planning."}
                </div>
              ) : (
                subjectNeeds.map((subject) => {
                  const done = subject.sessions > 0 ? Math.round(((subject.sessions - subject.unassigned) / subject.sessions) * 100) : 0;
                  return (
                    <article key={subject.subjectName} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black">{subject.subjectName}</h3>
                          <p className="mt-1 text-xs text-white/45">
                            {subject.sessions} {rtl ? "حصة" : "séances"} · {subject.unassigned} {rtl ? "بدون أستاذ" : "sans prof"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-accent">
                          {done}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${done}%` }} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Action href={`/${lang}/studio`} title={rtl ? "فضاء الأستاذ" : "Espace prof"} body={rtl ? "نشر الدروس والملفات والمحتوى." : "Publier cours, fichiers et contenu."} />
          <Action href={`/${lang}/attendance`} title={rtl ? "الحضور" : "Présences"} body={rtl ? "تسجيل حضور التلاميذ." : "Marquer les présences."} />
          <Action href={`/${lang}/homework`} title={rtl ? "الواجبات" : "Devoirs"} body={rtl ? "إنشاء وتصحيح الواجبات." : "Créer et corriger les devoirs."} />
          <Action href={`/${lang}/admin/planning`} title={rtl ? "التخطيط" : "Planning"} body={rtl ? "ربط الأستاذ بالمادة والحصة." : "Affecter prof, matière et séance."} />
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/50">{label}</p>
    </div>
  );
}

function Action({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-accent/25 hover:bg-white/[0.055]">
      <h3 className="text-lg font-black text-chalk">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-chalk-dim">{body}</p>
      <span className="mt-4 inline-flex text-xs font-black text-accent">OPEN ←</span>
    </Link>
  );
}
