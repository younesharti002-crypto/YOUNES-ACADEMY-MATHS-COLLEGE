import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ACADEMY_METRICS, ACADEMY_PROGRAMS } from "@/lib/academy/catalog";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

type AdminModule = {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "accent" | "gold" | "subject" | "teacher" | "default";
};

function adminModules(lang: string, rtl: boolean): AdminModule[] {
  return [
    {
      icon: "➕",
      title: rtl ? "إدارة المواد" : "Gestion des matières",
      body: rtl
        ? "زيد مادة جديدة، عدل الاسم، فعل أو وقف المادة من هنا مباشرة."
        : "Ajoutez, modifiez, activez ou désactivez les matières directement.",
      href: `/${lang}/admin/subjects`,
      cta: rtl ? "إضافة مادة" : "Ajouter une matière",
      tone: "subject",
    },
    {
      icon: "🟢",
      title: rtl ? "طلبات التسجيل" : "Demandes d’inscription",
      body: rtl
        ? "طلبات الموقع، تواصل واتساب، حالة الطلب، وتحويله لتلميذ."
        : "Leads du site, WhatsApp, statut et conversion en élève.",
      href: `/${lang}/admin/leads`,
      cta: rtl ? "فتح الطلبات" : "Ouvrir les demandes",
      tone: "accent",
    },
    {
      icon: "👨‍🏫",
      title: rtl ? "الأساتذة" : "Professeurs",
      body: rtl
        ? "إنشاء حساب الأستاذ، تتبع الحصص، وربطه بالمادة والتخطيط."
        : "Comptes professeurs, séances et affectation aux matières.",
      href: `/${lang}/admin/profs`,
      cta: rtl ? "إدارة الأساتذة" : "Gérer les profs",
      tone: "teacher",
    },
    {
      icon: "👨‍🎓",
      title: rtl ? "التلاميذ والحسابات" : "Élèves & comptes",
      body: rtl
        ? "إضافة التلاميذ، ربط ولي الأمر، تفعيل/توقيف الحسابات وكلمات السر."
        : "Élèves, parents, activation, désactivation et mots de passe.",
      href: `/${lang}/admin/people`,
      cta: rtl ? "إدارة الأشخاص" : "Gérer les personnes",
      tone: "default",
    },
    {
      icon: "📚",
      title: rtl ? "المستويات والشعب" : "Niveaux & filières",
      body: rtl
        ? "إدارة 4AP حتى 2BAC، الشعب، المجموعات وربط المواد بالمستويات."
        : "Niveaux, filières, groupes et liaison des matières aux niveaux.",
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
        : "Présences et absences des élèves.",
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
                  ? "من هنا كتتحكم فالمواد، التسجيل، الأساتذة، التلاميذ، التخطيط، الحضور، الواجبات، الأداءات والمحتوى."
                  : "Contrôlez les matières, inscriptions, professeurs, élèves, planning, présences, devoirs, paiements et contenu."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/admin/subjects`}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft"
              >
                {rtl ? "إضافة مادة" : "Ajouter matière"}
              </Link>
              <Link
                href={`/${lang}/admin/leads`}
                className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-5 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15"
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
          <Metric value={String(ACADEMY_PROGRAMS.length)} label={rtl ? "المستويات / الشعب" : "Niveaux / filières"} />
          <Metric value={String(ACADEMY_METRICS.weeklySessions)} label={rtl ? "حصة أسبوعية" : "Séances / semaine"} />
          <Metric value={String(ACADEMY_METRICS.weeklyHours)} label={rtl ? "ساعة أسبوعياً" : "Heures / semaine"} />
          <Metric value={`${ACADEMY_METRICS.occupancyPercent}%`} label={rtl ? "استغلال القاعات" : "Occupation"} />
          <Metric value={String(ACADEMY_METRICS.freeSlots)} label={rtl ? "حصة متاحة" : "Créneaux libres"} />
        </section>

        <section className="mt-8 rounded-[2rem] border border-accent/25 bg-accent/[0.07] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-accent">{rtl ? "أول عملية مهمة" : "Action prioritaire"}</p>
              <h2 className="mt-1 text-2xl font-black">{rtl ? "إضافة مادة جديدة" : "Ajouter une nouvelle matière"}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-chalk-dim">
                {rtl
                  ? "دخل لهنا، كتب اسم المادة فقط بحال: الفلسفة، الرياضيات، PC… والنظام يولد الكود تلقائياً."
                  : "Ouvrez cette page, saisissez uniquement le nom de la matière; le système génère le slug automatiquement."}
              </p>
            </div>
            <Link
              href={`/${lang}/admin/subjects`}
              className="inline-flex w-fit rounded-full bg-accent px-6 py-3 text-sm font-black text-board-900 transition hover:bg-accent-soft"
            >
              {rtl ? "فتح إدارة المواد" : "Ouvrir les matières"}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/70">Control Center</p>
              <h2 className="mt-1 text-2xl font-black">{rtl ? "العمليات اليومية" : "Opérations quotidiennes"}</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((item) => (
              <AdminModuleCard key={item.href} {...item} />
            ))}
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>{rtl ? "THE SECRET ACADEMY • فضاء الإدارة" : "THE SECRET ACADEMY • Admin space"}</span>
          <span>{rtl ? "المرحلة الحالية: تحويل الواجهة إلى تحكم حقيقي" : "Current phase: turning the UI into real controls"}</span>
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

function AdminModuleCard({ icon, title, body, href, cta, tone }: AdminModule) {
  const classes =
    tone === "accent"
      ? "border-emerald-300/25 bg-emerald-300/[0.08] hover:bg-emerald-300/[0.12]"
      : tone === "gold"
        ? "border-accent/25 bg-accent/[0.07] hover:bg-accent/[0.1]"
        : tone === "subject"
          ? "border-accent/35 bg-accent/[0.12] hover:bg-accent/[0.16]"
          : tone === "teacher"
            ? "border-sky-300/25 bg-sky-300/[0.08] hover:bg-sky-300/[0.12]"
            : "border-white/10 bg-white/[0.04] hover:border-accent/25 hover:bg-white/[0.055]";

  return (
    <Link href={href} className={`group rounded-3xl border p-5 transition ${classes}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-xl">{icon}</span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black text-white/50 transition group-hover:text-accent">OPEN</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-chalk">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-chalk-dim">{body}</p>
      <span className="mt-4 inline-flex text-xs font-black text-accent">{cta} ←</span>
    </Link>
  );
}
