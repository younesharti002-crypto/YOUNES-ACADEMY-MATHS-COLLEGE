import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ACADEMY_METRICS, ACADEMY_PROGRAMS } from "@/lib/academy/catalog";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

type ControlItem = {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "accent" | "gold" | "subject" | "teacher" | "danger" | "default";
};

function fullAdminControls(lang: string, rtl: boolean): ControlItem[] {
  return [
    {
      icon: "➕",
      title: rtl ? "إضافة / إدارة المواد" : "Ajouter / gérer les matières",
      body: rtl ? "زيد مادة جديدة، عدل الاسم، فعل أو وقف المادة." : "Ajouter, renommer, activer ou désactiver une matière.",
      href: `/${lang}/admin/subjects`,
      cta: rtl ? "فتح إدارة المواد" : "Ouvrir matières",
      tone: "subject",
    },
    {
      icon: "📚",
      title: rtl ? "المستويات والشعب والمجموعات" : "Niveaux, filières et groupes",
      body: rtl ? "زيد مستوى، شعبة، مجموعة وربطها بالسنة الدراسية." : "Créer niveaux, filières, groupes et année scolaire.",
      href: `/${lang}/admin/academic`,
      cta: rtl ? "الإدارة الأكاديمية" : "Gestion académique",
      tone: "gold",
    },
    {
      icon: "👨‍🎓",
      title: rtl ? "إضافة / إدارة التلاميذ" : "Ajouter / gérer les élèves",
      body: rtl ? "إنشاء حساب تلميذ، تعيين المستوى والمجموعة، وتفعيل الحساب." : "Créer les comptes élèves, niveau, groupe et activation.",
      href: `/${lang}/admin/academic`,
      cta: rtl ? "إضافة تلميذ" : "Ajouter élève",
      tone: "default",
    },
    {
      icon: "🟢",
      title: rtl ? "طلبات التسجيل" : "Demandes d’inscription",
      body: rtl ? "كل طلب جاي من الموقع، تغيير حالته وتحويله لحساب تلميذ." : "Gérer les leads et les convertir en comptes élèves.",
      href: `/${lang}/admin/leads`,
      cta: rtl ? "فتح الطلبات" : "Ouvrir demandes",
      tone: "accent",
    },
    {
      icon: "👨‍🏫",
      title: rtl ? "الأساتذة" : "Professeurs",
      body: rtl ? "حسابات الأساتذة، الحصص المعينة، والمواد التي تحتاج أستاذ." : "Comptes profs, séances affectées et matières à affecter.",
      href: `/${lang}/admin/profs`,
      cta: rtl ? "إدارة الأساتذة" : "Gérer profs",
      tone: "teacher",
    },
    {
      icon: "🗓️",
      title: rtl ? "التخطيط والقاعات" : "Planning et salles",
      body: rtl ? "الحصص، القاعات، الأيام، التوقيت وربط الأستاذ بالحصة." : "Séances, salles, jours, horaires et professeurs.",
      href: `/${lang}/admin/planning`,
      cta: rtl ? "فتح التخطيط" : "Ouvrir planning",
      tone: "default",
    },
    {
      icon: "✅",
      title: rtl ? "الحضور والغياب" : "Présences et absences",
      body: rtl ? "تسجيل الحضور وتتبع الغياب من نفس المنصة." : "Marquer les présences et suivre les absences.",
      href: `/${lang}/attendance`,
      cta: rtl ? "تسجيل الحضور" : "Marquer présence",
      tone: "default",
    },
    {
      icon: "✍️",
      title: rtl ? "الواجبات والتصحيح" : "Devoirs et correction",
      body: rtl ? "إنشاء واجب، تتبع الحلول وتصحيح إجابات التلاميذ." : "Créer devoirs, suivre dépôts et corrections.",
      href: `/${lang}/homework`,
      cta: rtl ? "إدارة الواجبات" : "Gérer devoirs",
      tone: "default",
    },
    {
      icon: "🎥",
      title: rtl ? "المحتوى والدروس" : "Contenu et cours",
      body: rtl ? "إضافة الدروس، الملفات، الفيديوهات والمحتوى الرقمي." : "Publier cours, fichiers, vidéos et contenu numérique.",
      href: `/${lang}/studio`,
      cta: "Content Studio",
      tone: "default",
    },
    {
      icon: "💳",
      title: rtl ? "الأداءات والمالية" : "Paiements et finance",
      body: rtl ? "تتبع الأداءات والحالة المالية وتقسيم المداخيل." : "Paiements, statut financier et répartition des revenus.",
      href: `/${lang}/admin/payments`,
      cta: rtl ? "فتح الأداءات" : "Voir paiements",
      tone: "default",
    },
    {
      icon: "👥",
      title: rtl ? "الأشخاص والحسابات" : "Personnes et comptes",
      body: rtl ? "التلاميذ، الأولياء، الأساتذة، وتفعيل أو توقيف الحسابات." : "Élèves, parents, professeurs, activation et désactivation.",
      href: `/${lang}/admin/people`,
      cta: rtl ? "إدارة الأشخاص" : "Gérer personnes",
      tone: "default",
    },
    {
      icon: "🔐",
      title: rtl ? "الأمان وكلمات السر" : "Sécurité et mots de passe",
      body: rtl ? "إعدادات الولوج، Reset password، ومراقبة الحسابات." : "Accès, reset password et contrôle des comptes.",
      href: `/${lang}/admin/security`,
      cta: rtl ? "فتح الأمان" : "Ouvrir sécurité",
      tone: "danger",
    },
  ];
}

export default async function AdminHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  const rtl = lang === "ar";
  const controls = fullAdminControls(lang, rtl);

  return (
    <main className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10" dir={rtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                ADMIN FULL CONTROL
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "مركز التحكم الكامل" : "Centre de contrôle complet"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "أنت داخل بصلاحية Admin. من هنا كتتحكم فالمواد، المستويات، التلاميذ، الأساتذة، التسجيل، التخطيط، الحضور، الواجبات، الأداءات والمحتوى."
                  : "Vous êtes connecté en Admin. Depuis cette page, vous contrôlez matières, niveaux, élèves, professeurs, inscriptions, planning, présences, devoirs, paiements et contenu."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/${lang}/admin/subjects`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft">
                {rtl ? "إضافة مادة" : "Ajouter matière"}
              </Link>
              <Link href={`/${lang}/admin/academic`} className="rounded-full border border-accent/35 bg-accent/10 px-5 py-2.5 text-sm font-black text-accent transition hover:bg-accent/15">
                {rtl ? "المستويات" : "Niveaux"}
              </Link>
              <Link href={`/${lang}/admin/leads`} className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-5 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15">
                {rtl ? "طلبات التسجيل" : "Demandes"}
              </Link>
              <Link href={`/${lang}`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5">
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
              <p className="text-sm font-black text-accent">{rtl ? "صلاحياتك مفعلة" : "Permissions activées"}</p>
              <h2 className="mt-1 text-2xl font-black">{rtl ? "كل أزرار التحكم أمامك" : "Tous les contrôles sont disponibles"}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-chalk-dim">
                {rtl
                  ? "بداية من إضافة مادة حتى إدارة الحسابات والأداءات. اختار العملية من الكروت لتحت."
                  : "De l’ajout d’une matière jusqu’aux comptes et paiements. Choisissez l’action ci-dessous."}
              </p>
            </div>
            <Link href={`/${lang}/admin/subjects`} className="inline-flex w-fit rounded-full bg-accent px-6 py-3 text-sm font-black text-board-900 transition hover:bg-accent-soft">
              {rtl ? "ابدأ بإضافة مادة" : "Commencer par matière"}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent/70">Permissions</p>
              <h2 className="mt-1 text-2xl font-black">{rtl ? "صلاحيات التحكم" : "Permissions de contrôle"}</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {controls.map((item) => (
              <ControlCard key={item.href} {...item} />
            ))}
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>{rtl ? "THE SECRET ACADEMY • صلاحيات Admin" : "THE SECRET ACADEMY • Admin permissions"}</span>
          <span>{rtl ? "المرحلة الحالية: اختبار التحكم الحقيقي" : "Current phase: testing real admin control"}</span>
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

function ControlCard({ icon, title, body, href, cta, tone }: ControlItem) {
  const classes =
    tone === "accent"
      ? "border-emerald-300/25 bg-emerald-300/[0.08] hover:bg-emerald-300/[0.12]"
      : tone === "gold"
        ? "border-accent/25 bg-accent/[0.07] hover:bg-accent/[0.1]"
        : tone === "subject"
          ? "border-accent/35 bg-accent/[0.12] hover:bg-accent/[0.16]"
          : tone === "teacher"
            ? "border-sky-300/25 bg-sky-300/[0.08] hover:bg-sky-300/[0.12]"
            : tone === "danger"
              ? "border-rose-300/25 bg-rose-300/[0.07] hover:bg-rose-300/[0.1]"
              : "border-white/10 bg-white/[0.04] hover:border-accent/25 hover:bg-white/[0.055]";

  return (
    <Link href={href} className={`group rounded-3xl border p-5 transition ${classes}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-xl">{icon}</span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black text-white/50 transition group-hover:text-accent">ADMIN</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-chalk">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-chalk-dim">{body}</p>
      <span className="mt-4 inline-flex text-xs font-black text-accent">{cta} ←</span>
    </Link>
  );
}
