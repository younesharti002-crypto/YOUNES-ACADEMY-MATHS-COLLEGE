import Link from "next/link";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { registrationLeads } from "@/db/lead-schema";
import { LeadConvertForm } from "@/components/admin/LeadConvertForm";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ensureLeadsSchema } from "@/lib/leads/ensure-leads-schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ConvertLeadPage({
  params,
}: {
  params: Promise<{ lang: string; leadId: string }>;
}) {
  const { lang, leadId } = await params;
  if (!isLocale(lang)) notFound();
  if (!UUID_PATTERN.test(leadId)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "ADMIN") {
    redirect(`/${lang}/login`);
  }

  await ensureLeadsSchema();

  const [lead] = await db
    .select()
    .from(registrationLeads)
    .where(eq(registrationLeads.id, leadId))
    .limit(1);

  if (!lead) notFound();

  const rtl = lang === "ar";

  return (
    <main className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10" dir={rtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                LEAD → STUDENT
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {rtl ? "تحويل الطلب إلى حساب تلميذ" : "Convertir la demande en élève"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">
                {rtl
                  ? "أكد معلومات التلميذ وولي الأمر قبل إنشاء الحسابات الرسمية."
                  : "Confirmez les informations de l’élève et du parent avant de créer les comptes officiels."}
              </p>
            </div>
            <Link href={`/${lang}/admin/leads`} className="w-fit rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/5">
              {rtl ? "رجوع للطلبات" : "Retour demandes"}
            </Link>
          </div>
        </header>

        {lead.status === "REGISTERED" ? (
          <section className="mt-8 rounded-[2rem] border border-accent/20 bg-accent/10 p-6 text-accent">
            <p className="font-black">{rtl ? "هذا الطلب مسجل من قبل." : "Cette demande est déjà enregistrée."}</p>
          </section>
        ) : (
          <LeadConvertForm
            locale={lang}
            leadId={lead.id}
            lead={{
              fullName: lead.fullName,
              phone: lead.phone,
              level: lead.level,
              subject: lead.subject,
            }}
          />
        )}
      </div>
    </main>
  );
}
