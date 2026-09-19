import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { locales, localeLabel, type Locale } from "@/i18n/config";

export function Header({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const homeLabel = locale === "ar" ? "الرئيسية" : "Accueil";
  const navItems = [
    { href: `/${locale}`, label: homeLabel },
    { href: "#about", label: dict.nav.about },
    { href: "#cours", label: dict.nav.cours },
    { href: "#lives", label: dict.nav.lives },
    { href: "#replays", label: dict.nav.replays },
    { href: "#exercices", label: dict.nav.exercices },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-accent/15 bg-[#050b13]/92 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <Link href={`/${locale}`} className="group flex items-center gap-3">
          <span className="brand-text text-3xl font-black leading-none tracking-[-0.08em]">TSA</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold tracking-[0.12em] text-chalk">THE SECRET</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.38em] text-accent">ACADEMY</span>
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-7 text-[13px] font-semibold text-chalk-dim lg:flex">
          {navItems.map((item, index) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-2 transition-colors hover:text-chalk ${index === 0 ? "text-chalk" : ""}`}
              >
                {item.label}
                {index === 0 ? <span className="absolute inset-x-0 -bottom-1 mx-auto h-px w-8 bg-accent" /> : null}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="py-2 transition-colors hover:text-chalk">
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <div
            className="hidden items-center rounded-lg border border-white/10 bg-white/[0.025] p-0.5 text-[11px] sm:flex"
            aria-label={dict.common.languageLabel}
          >
            {locales.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                aria-current={code === locale ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  code === locale
                    ? "bg-accent/15 font-bold text-accent"
                    : "text-chalk-dim hover:text-chalk"
                }`}
              >
                {localeLabel[code]}
              </Link>
            ))}
          </div>

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/55 px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-board-900"
          >
            <span aria-hidden="true">♙</span>
            {dict.nav.cta}
          </Link>
        </div>
      </div>

      <nav className="flex gap-5 overflow-x-auto border-t border-white/[0.06] px-5 py-2 text-xs font-semibold text-chalk-dim lg:hidden">
        {navItems.map((item) =>
          item.href.startsWith("/") ? (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-accent">
              {item.label}
            </Link>
          ) : (
            <a key={item.href} href={item.href} className="whitespace-nowrap hover:text-chalk">
              {item.label}
            </a>
          ),
        )}
      </nav>
    </header>
  );
}
