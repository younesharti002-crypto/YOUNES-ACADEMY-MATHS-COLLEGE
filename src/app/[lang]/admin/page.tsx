import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ACADEMY_METRICS,
  ACADEMY_PROGRAMS,
  ACADEMY_SEGMENT_LABELS,
  type AcademySegment,
} from "@/lib/academy/catalog";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const SEGMENTS: AcademySegment[] = ["primaire", "college", "lycee"];

type AdminModule = {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "accent" | "gold" | "default" | "teacher";
};

function adminModules(lang: string, rtl: boolean): AdminModule[] {
  return [
    {
      icon: "🟢",
      title: rtl ? "طلبات التسجيل" : "Demandes d’inscription",
      body: rtl
        ? "كل طلب جاي من Landing Page، تواصل واتساب، حالة الطلب، وتحويله لتلميذ."
        : "Leads de la landing page, WhatsApp, statut et conversion en élève.",
      href: `/${lang}/admin/leads`,
      cta: rtl ? "فتح الطلبات" : "Ouvrir les demandes",
      tone: "accent",
    },
    {
      icon: "👨‍🏫",
      title: rtl ? "الأساتذة" : "Professeurs",
      body: rtl
        ? "إنشاء حساب الأستاذ، تتبع الحصص المعينة، ومعرفة المواد التي مازال خاصها أستاذ."
        : "Comptes professeurs, séances affectées et matières qui attendent un professeur.",
      href: `/${lang}/admin/profs`,
      cta: rtl ? "إدارة الأساتذة" : "Gérer les professeurs",
      tone: "teacher",
    },
    {
      icon: "👨‍🎓",
      title: rtl ? "التلاميذ والحسابات" : "Élèves & comptes",
      body: rtl
        ? "إنشاء الحسابات، ربط الولي، تفعيل/توقيف المستخدمين، وكلمات السر."
        : "Comptes, parents liés, activation, désactivation et mots de passe.",
      href: `/${lang}/admin/people`,
      cta: rtl ? "إدارة الأشخاص" : "Gérer les personnes",
      tone: "default",
    },
    {
      icon: "📚",
      title: rtl ? "المواد والمستويات" : "Matières & niveaux",
      body: rtl
        ? "4AP حتى 2BAC، الشعب، المواد، وعدد الحصص الأسبوعية."
        : "Niveaux, filières, matières et charges hebdomadaires.",
      href: `/${lang}/admin/academic`,
      cta: rtl ? "الإدارة الأكاديمية" : "Gestion académique",
      tone: "gold",
    },
    {
      icon: "🗓️",
      title: rtl ? "التخطيط" : "Planning",
      body: rtl
        ? "الحصص، القاعات، الأيام، التوقيت، وربط الأستاذ بالمادة والحصة."
        : "Séances, salles, jours, horaires et affectation professeurs.",
      href: `/${lang}/admin/planning`,
      cta: rtl ? "فتح التخطيط" : "Ouvrir planning",
      tone: "default",
    },
    {
      icon: "✅",
      title: rtl ? "الحضور" : "Présences",
      body: rtl
        ? "تسجيل حضور التلاميذ وتتبع الغياب داخل المنصة."
        : "Suivi des présences et absences des élèves.",
      href: `/${lang}/attendance`,
      cta: rtl ? "تسجيل الحضور" : "Marquer présence",
      tone: "default",
    },
    {
      icon: "✍️",
      title: rtl ? "الواجبات" : "Devoirs",
      body: rtl
        ? "إنشاء الواجبات، تتبع الحلول، والتصحيح."
        : "Créer les devoirs, suivre les dépôts et corrections.",
      href: `/${lang}/homework`,
      cta: rtl ? "إدارة الواجبات" : "Gérer devoirs",
      tone: "default",
    },
    {
      icon: "💳",
      title: rtl ? "الأداءات" : "Paiements",
      body: rtl
        ? "تتبع الأداءات، الحالة المالية، وتقسيم المداخيل."
        : "Paiements, état financier et répartition des revenus.",
      href: `/${lang}/admin/payments`,
      cta: rtl ? "فتح الأداءات" : "Voir paiements",
      tone: "default",
    },
    {
      icon: "🎥",
      title: rtl ? "المحتوى والدروس" : "Contenu & cours",
      body: rtl
        ? "إضافة الدروس، الملفات، الفيديوهات، والمحتوى الرقمي."
        : "Publier cours, fichiers, vidéos et contenu numérique.",
      href: `/${lang}/studio`,
      cta: "Content Studio",
      tone: "default",
    },
    {
      icon: "🔐",
      title: rtl ? "الأمان" : "Sécurité",
      body: rtl
        ? "مراقبة الحسابات، الحماية، وإعدادات الولوج."
        : "Contrôle des comptes, sécurité et accès.",
      href: `/${lang}/admin/security`,
      cta: rtl ? "إعدادات الأمان" : "Sécurité",
      tone: "default",
    },
  ];
}

export default async function AdminHomePage({
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
  const modules = adminModules(lang, rtl);

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                THE SECRET ACADEMY ADMIN
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "فضاء الإدارة" : "Espace administration"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "مركز التحكم اليومي ديال الأكاديمية: التسجيل، الأساتذة، التلاميذ، المواد، التخطيط، الحضور، الواجبات، الأداءات والمحتوى."
                  : "Centre de contrôle quotidien : inscriptions, professeurs, élèves, matières, planning, présences, devoirs, paiements et contenu."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/admin/leads`}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft"
              >
                {rtl ? "طلبات التسجيل" : "Demandes"}
              </Link>
              <Link
                href={`/${lang}/admin/profs`}
                className="rounded-full border border-sky-300/35 bg-sky-300/10 px-5 py-2.5 text-sm font-black text-sky-100 transition hover:bg-sky-300/15"
              >
                {rtl ? "الأساتذة" : "Profs"}
              </Link>
              <Link
                href={`/${lang}`}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5"
              >
                {rtl ? "الموقع" : "Site"}
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            value={String(ACADEMY_PROGRAMS.length)}
            label={rtl ? "المستويات / الشعب" : "Niveaux / filières"}
          />
          <Metric
            value={String(ACADEMY_METRICS.weeklySessions)}
            label={rtl ? "حصة أسبوعية" : "Séances / semaine"}
          />
          <Metric
            value={String(ACADEMY_METRICS.weeklyHours)}
            label={rtl ? "ساعة أسبوعياً" : "Heures / semaine"}
          />
          <Metric
            value={`${ACADEMY_METRICS.occupancyPercent}%`}
            label={rtl ? "استغلال القاعات" : "Occupation"}
          />
          <Metric
            value={String(ACADEMY_METRICS.freeSlots)}
            label={rtl ? "حصة متاحة" : "Créneaux libres"}
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/70">
                Control Center
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {rtl ? "العمليات اليومية" : "Opérations quotidiennes"}
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((item) => (
              <AdminModuleCard key={item.href} {...item} />
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-sky-200">
                {rtl ? "مسار الأستاذ" : "Parcours professeur"}
              </p>
              <p className="mt-1 text-sm leading-6 text-sky-50/70">
                {rtl
                  ? "أنشئ حساب الأستاذ من إدارة الأشخاص، ثم اربطه بالمادة والحصة من التخطيط، وبعدها يدخل لفضاء الأستاذ لنشر الدروس والواجبات وتسجيل الحضور."
                  : "Créez le compte professeur, affectez-le au planning, puis il utilise son espace pour publier, donner les devoirs et marquer les présences."}
              </p>
            </div>
            <Link href={`/${lang}/admin/profs`} className="inline-flex w-fit rounded-full border border-sky-200/25 px-3 py-1 text-xs font-black text-sky-200">
              {rtl ? "فتح إدارة الأساتذة" : "Ouvrir profs"}
            </Link>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          {SEGMENTS.map((segment) => {
            const programs = ACADEMY_PROGRAMS.filter(
              (program) => program.segment === segment,
            );
            const sessions = programs.reduce(
              (sum, program) => sum + program.weeklySessions,
              0,
            );

            return (
              <section key={segment}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-accent/70">
                      {segment}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {ACADEMY_SEGMENT_LABELS[segment][lang]}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                    {sessions} {rtl ? "حصة" : "séances"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {programs.map((program) => (
                    <article
                      key={program.key}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-accent/25 hover:bg-white/[0.055]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black">{program.label}</h3>
                          <p className="mt-1 text-xs text-white/45">
                            {program.weeklySessions} {rtl ? "حصص / أسبوع" : "séances / semaine"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/55">
                          {rtl ? "الأستاذ: حسب التخطيط" : "Prof : planning"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {program.subjects.map((item) => (
                          <span
                            key={`${program.key}-${item.subject}`}
                            className="rounded-xl border border-accent/15 bg-accent/[0.07] px-3 py-2 text-xs font-bold text-accent-soft"
                          >
                            {item.subject} × {item.sessions}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>
            {rtl ? "THE SECRET ACADEMY • فضاء الإدارة" : "THE SECRET ACADEMY • Admin space"}
          </span>
          <span>
            {rtl
              ? "المرحلة الحالية: اختبار التشغيل الحقيقي مع أول تلميذ وولي أمر وأستاذ"
              : "Phase actuelle : test réel avec un premier élève, parent et professeur"}
          </span>
        </footer>
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

function AdminModuleCard({
  icon,
  title,
  body,
  href,
  cta,
  tone,
}: AdminModule) {
  const featured = tone === "accent";
  const gold = tone === "gold";
  const teacher = tone === "teacher";

  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-5 transition ${
        featured
          ? "border-emerald-300/25 bg-emerald-300/[0.08] hover:bg-emerald-300/[0.12]"
          : gold
            ? "border-accent/25 bg-accent/[0.07] hover:bg-accent/[0.1]"
            : teacher
              ? "border-sky-300/25 bg-sky-300/[0.07] hover:bg-sky-300/[0.1]"
              : "border-white/10 bg-white/[0.04] hover:border-accent/25 hover:bg-white/[0.055]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-xl">
          {icon}
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black text-white/50 transition group-hover:text-accent">
          OPEN
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black text-chalk">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-chalk-dim">{body}</p>
      <span className="mt-4 inline-flex text-xs font-black text-accent">
        {cta} ←
      </span>
    </Link>
  );
}
