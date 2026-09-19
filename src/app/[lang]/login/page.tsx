import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { isLocale } from "@/i18n/config";
import { academyLinks, academySocialLinks } from "@/lib/academy-links";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const isAr = lang === "ar";
  const backLabel = isAr ? "العودة إلى الموقع" : "Retour au site";
  const lead = isAr
    ? "دروسك، تسجيلاتك، تمارينك ونتائجك في فضاء واحد."
    : "Vos cours, replays, exercices et résultats dans un seul espace.";
  const welcome = isAr ? "مرحباً بك مجدداً" : "Heureux de vous revoir";
  const linksTitle = isAr ? "الروابط الرسمية" : "Liens officiels";

  return (
    <main
      className="graph-paper relative min-h-screen overflow-hidden bg-[#050b13] bg-cover bg-center px-4 py-5 sm:px-7 sm:py-8 lg:px-10"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(5,11,19,0.95), rgba(5,11,19,0.78), rgba(5,11,19,0.94)), url('/brand/cosmic-hero.webp')",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#050b13]/25" />
      <div aria-hidden="true" className="pointer-events-none absolute -end-40 -top-40 size-[34rem] rounded-full bg-accent/[0.08] blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 pb-5">
        <Link href={`/${lang}`} className="flex items-center gap-3">
          <Image
            src="/brand/secret-academy-logo.svg"
            alt="THE SECRET ACADEMY"
            width={64}
            height={64}
            priority
            className="size-14 rounded-xl object-cover"
          />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.12em] text-chalk">THE SECRET</span>
            <span className="block text-[9px] font-bold tracking-[0.34em] text-accent">ACADEMY</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={academyLinks.whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-2 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-black text-accent transition hover:bg-accent hover:text-board-900 sm:inline-flex"
          >
            <SocialIcon name="whatsapp" className="size-4" />
            WhatsApp
          </a>
          <Link
            href={`/${lang}`}
            className="rounded-lg border border-white/10 bg-[#050b13]/55 px-3 py-2 text-xs font-semibold text-chalk-dim backdrop-blur-md transition hover:border-accent/40 hover:text-accent"
          >
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-accent/20 bg-[#07111c]/88 shadow-[0_35px_100px_rgba(0,0,0,0.5)] backdrop-blur-md lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden min-h-[42rem] overflow-hidden lg:block">
          <Image
            src="/brand/secret-academy-logo.svg"
            alt="Logo THE SECRET ACADEMY"
            fill
            priority
            sizes="48vw"
            className="object-contain p-10 xl:p-14"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050b13] via-[#050b13]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
            <div className="inline-flex rounded-full border border-accent/35 bg-[#050b13]/70 px-3 py-1.5 text-xs font-bold text-accent backdrop-blur-xl">
              THE SECRET ACADEMY
            </div>
            <h1 className="mt-4 max-w-md text-4xl font-black leading-tight text-chalk">{welcome}</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-chalk-dim">{lead}</p>

            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">{linksTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {academySocialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label}
                    title={link.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-chalk-dim transition hover:border-accent/45 hover:text-accent"
                  >
                    <SocialIcon name={link.key} className="size-4" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[36rem] items-center p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="w-full">
            <div className="mb-7 lg:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">THE SECRET ACADEMY</p>
              <h1 className="mt-2 text-3xl font-black text-chalk">{welcome}</h1>
              <p className="mt-2 text-sm leading-7 text-chalk-dim">{lead}</p>
            </div>
            <LoginForm locale={lang} />
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">{linksTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {academySocialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label}
                    title={link.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-chalk-dim transition hover:border-accent/45 hover:text-accent"
                  >
                    <SocialIcon name={link.key} className="size-4" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
