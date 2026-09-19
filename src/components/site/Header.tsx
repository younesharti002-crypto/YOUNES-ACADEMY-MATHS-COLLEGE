import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { locales, localeLabel, type Locale } from "@/i18n/config";
import { academyLinks, academySocialLinks } from "@/lib/academy-links";

export function Header({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const homeLabel = locale === "ar" ? "الرئيسية" : "Accueil";
  const navItems = [
    { href: `/${locale}`, label: homeLabel },
    { href: "#about", label: dict.nav.about },
    { href: "#primaire", label: dict.nav.cours },
    { href: "#college", label: dict.nav.lives },
    { href: "#lycee", label: dict.nav.replays },
    { href: "#parents", label: dict.nav.exercices },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-accent/15 bg-[#050b13]/92 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <Link href={`/${locale}`} className="group flex items-center gap-3">
          <Image
            src="/brand/secret-academy-logo.svg"
            alt="THE SECRET ACADEMY"
            width={58}
            height={58}
            priority
            className="size-12 rounded-xl object-cover shadow-[0_0_24px_rgba(209,166,54,0.16)] sm:size-14"
          />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold tracking-[0.09em] text-chalk">THE SECRET</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.34em] text-accent">ACADEMY</span>
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
          <div className="hidden items-center gap-1 xl:flex">
            {academySocialLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-[10px] font-black text-chalk-dim transition hover:border-accent/50 hover:text-accent"
                aria-label={link.label}
              >
                {link.shortLabel}
              </a>
            ))}
          </div>

          <div className="hidden items-center rounded-lg border border-white/10 bg-white/[0.025] p-0.5 text-[11px] sm:flex">
            {locales.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  code === locale ? "bg-accent/15 font-bold text-accent" : "text-chalk-dim hover:text-chalk"
                }`}
              >
                {localeLabel[code]}
              </Link>
            ))}
          </div>

          <a
            href={academyLinks.whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-lg border border-accent/55 px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-board-900 md:inline-flex"
          >
            WhatsApp
          </a>

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/55 px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-board-900"
          >
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
        {academySocialLinks.map((link) => (
          <a key={link.key} href={link.href} target="_blank" rel="noreferrer noopener" className="whitespace-nowrap text-accent">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
