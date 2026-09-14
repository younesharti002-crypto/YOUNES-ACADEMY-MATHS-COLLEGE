import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { PORTRAIT_SRC } from "@/components/ui/Section";
import { isLocale } from "@/i18n/config";

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

  return (
    <main className="graph-paper relative min-h-screen overflow-hidden bg-[#050b13] px-4 py-5 sm:px-7 sm:py-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -end-40 -top-40 size-[34rem] rounded-full bg-accent/[0.06] blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 pb-5">
        <Link href={`/${lang}`} className="flex items-center gap-3">
          <span className="brand-text text-3xl font-black tracking-[-0.08em]">YA</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.12em] text-chalk">YOUNES</span>
            <span className="block text-[9px] font-bold tracking-[0.34em] text-accent">ACADEMY</span>
          </span>
        </Link>

        <Link
          href={`/${lang}`}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-chalk-dim transition hover:border-accent/40 hover:text-accent"
        >
          {backLabel}
        </Link>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-accent/20 bg-[#07111c]/85 shadow-[0_35px_100px_rgba(0,0,0,0.5)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden min-h-[42rem] overflow-hidden lg:block">
          <Image
            src={PORTRAIT_SRC}
            alt="Younes Academy"
            fill
            priority
            unoptimized
            sizes="48vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050b13] via-[#050b13]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
            <div className="inline-flex rounded-full border border-accent/35 bg-[#050b13]/70 px-3 py-1.5 text-xs font-bold text-accent backdrop-blur-xl">
              Younes Academy
            </div>
            <h1 className="mt-4 max-w-md text-4xl font-black leading-tight text-chalk">{welcome}</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-chalk-dim">{lead}</p>
          </div>
        </div>

        <div className="flex min-h-[36rem] items-center p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="w-full">
            <div className="mb-7 lg:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Younes Academy</p>
              <h1 className="mt-2 text-3xl font-black text-chalk">{welcome}</h1>
              <p className="mt-2 text-sm leading-7 text-chalk-dim">{lead}</p>
            </div>
            <LoginForm locale={lang} />
          </div>
        </div>
      </div>
    </main>
  );
}
