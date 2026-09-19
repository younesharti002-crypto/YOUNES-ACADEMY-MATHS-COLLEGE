import Link from "next/link";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { registrationLeads } from "@/db/lead-schema";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ensureLeadsSchema } from "@/lib/leads/ensure-leads-schema";

function phoneToWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0")) return `https://wa.me/212${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function statusClass(status: string) {
  if (status === "NEW") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (status === "CONTACTED") return "border-sky-300/20 bg-sky-300/10 text-sky-200";
  if (status === "REGISTERED") return "border-accent/20 bg-accent/10 text-accent";
  return "border-white/10 bg-white/[0.035] text-white/50";
}

function statusLabel(status: string, rtl: boolean) {
  if (status === "NEW") return rtl ? "جديد" : "Nouveau";
  if (status === "CONTACTED") return rtl ? "تم التواصل" : "Contacté";
  if (status === "REGISTERED") return rtl ? "مسجل" : "Inscrit";
  return rtl ? "مؤرشف" : "Archivé";
}

function StatusButton({
  leadId,
  status,
  label,
  tone = "default",
}: {
  leadId: string;
  status: "NEW" | "CONTACTED" | "REGISTERED" | "ARCHIVED";
  label: string;
  tone?: "default" | "gold" | "danger";
}) {
  const toneClass =
    tone === "gold"
      ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-board-900"
      : tone === "danger"
        ? "border-red-300/25 bg-red-300/10 text-red-200 hover:bg-red-300 hover:text-board-900"
        : "border-white/15 text-white/75 hover:bg-white/5";

  return (
    <form action={`/api/v1/admin/leads/${leadId}`} method="post">
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`rounded-full border px-4 py-2 text-xs font-bold transition ${toneClass}`}>
        {label}
      </button>
    </form>
  );
}

export default async function AdminLeadsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  await ensureLeadsSchema();

  const leads = await db
    .select()
    .from(registrationLeads)
    .orderBy(desc(registrationLeads.createdAt))
    .limit(100);

  const rtl = lang === "ar";
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  const contactedCount = leads.filter((lead) => lead.status === "CONTACTED").length;
  const registeredCount = leads.filter((lead) => lead.status === "REGISTERED").length;

  return (
    <main className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10" dir={rtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                LEADS / INSCRIPTIONS
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "طلبات التسجيل" : "Demandes d’inscription"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "كل طلب جديد من Landing Page كيدخل هنا. تواصل عبر واتساب، وبدّل الحالة باش تعرف فين وصل كل ولي أمر."
                  : "Chaque demande envoyée depuis la landing page arrive ici. Contactez le parent par WhatsApp, puis mettez à jour le statut."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${lang}/admin`} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5">
                {rtl ? "رجوع للوحة" : "Retour admin"}
              </Link>
              <Link href={`/${lang}`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft">
                {rtl ? "الموقع" : "Site"}
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          <Metric value={String(leads.length)} label={rtl ? "مجموع الطلبات" : "Total demandes"} />
          <Metric value={String(newCount)} label={rtl ? "طلبات جديدة" : "Nouvelles"} />
          <Metric value={String(contactedCount)} label={rtl ? "تم التواصل" : "Contactées"} />
          <Metric value={String(registeredCount)} label={rtl ? "مسجلين" : "Inscrites"} />
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
          <div className="grid gap-0">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-sm text-chalk-dim">
                {rtl ? "مازال ما كاين حتى طلب تسجيل." : "Aucune demande pour le moment."}
              </div>
            ) : (
              leads.map((lead) => {
                const whatsappText = encodeURIComponent(
                  rtl
                    ? `Salam ${lead.fullName}, m3ak THE SECRET ACADEMY. Tla9ina talab dialk: ${lead.level} / ${lead.subject}. Wach mazal baghi tsjel?`
                    : `Bonjour ${lead.fullName}, ici THE SECRET ACADEMY. Nous avons reçu votre demande: ${lead.level} / ${lead.subject}. Souhaitez-vous confirmer l’inscription?`,
                );
                const whatsappHref = `${phoneToWhatsapp(lead.phone)}?text=${whatsappText}`;

                return (
                  <article key={lead.id} className="grid gap-4 border-b border-white/10 p-5 last:border-b-0 xl:grid-cols-[1.05fr_0.9fr_1.15fr] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-chalk">{lead.fullName}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(lead.status)}`}>
                          {statusLabel(lead.status, rtl)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-chalk-dim">{lead.phone}</p>
                      {lead.message ? <p className="mt-2 text-xs leading-6 text-white/45">{lead.message}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-xl border border-accent/15 bg-accent/[0.07] px-3 py-2 text-xs font-bold text-accent-soft">{lead.level}</span>
                      <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/65">{lead.subject}</span>
                      <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/45">
                        {new Intl.DateTimeFormat(rtl ? "ar-MA" : "fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(lead.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <a href={whatsappHref} target="_blank" rel="noreferrer noopener" className="rounded-full bg-accent px-4 py-2 text-xs font-black text-board-900 transition hover:bg-accent-soft">
                        WhatsApp
                      </a>
                      <StatusButton leadId={lead.id} status="CONTACTED" label={rtl ? "تواصلنا" : "Contacté"} />
                      <StatusButton leadId={lead.id} status="REGISTERED" label={rtl ? "مسجل" : "Inscrit"} tone="gold" />
                      <StatusButton leadId={lead.id} status="ARCHIVED" label={rtl ? "أرشيف" : "Archiver"} tone="danger" />
                      {lead.status !== "NEW" ? <StatusButton leadId={lead.id} status="NEW" label={rtl ? "رجّعو جديد" : "Remettre"} /> : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
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
