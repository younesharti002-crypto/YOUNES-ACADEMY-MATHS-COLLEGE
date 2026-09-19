import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { locales, localeLabel, type Locale } from "@/i18n/config";

export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const releaseLabel = locale === "ar" ? "الإصدار الأول" : "Version 1";

  return (
    <footer className="border-t border-accent/15 bg-[#03080f] px-5 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-[1.3fr_.7fr] md:items-start">
        <div>
          <Link href={`/${locale}`} className="inline-flex items-center gap-3">
            <Image
              src="/images/secret-academy-logo.webp"
              alt="THE SECRET ACADEMY"
              width={72}
              height={72}
              className="size-14 rounded-2xl object-cover"
            />
            <span>
              <span className="block text-sm font-black tracking-wide text-chalk">{dict.common.brand}</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-accent">{dict.common.brandSuffix}</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-xs leading-6 text-chalk-dim">{dict.footer.tagline}</p>
          <p className="mt-2 text-xs font-bold text-accent">THE SECRET ACADEMY | سرك للتفوق</p>
        </div>

        <div className="text-xs text-chalk-dim md:text-end">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">LANGUAGE</p>
          <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
            {locales.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                className={`rounded-full border px-3 py-1.5 font-bold ${
                  code === locale
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-white/10 text-chalk-dim hover:border-white/20 hover:text-chalk"
                }`}
              >
                {localeLabel[code]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-9 flex w-full max-w-7xl flex-col gap-2 border-t border-white/[0.07] pt-5 text-[10px] text-chalk-dim sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} THE SECRET ACADEMY — {dict.footer.rights}</span>
        <span className="font-bold text-accent/80">{releaseLabel}</span>
      </div>
    </footer>
  );
}
