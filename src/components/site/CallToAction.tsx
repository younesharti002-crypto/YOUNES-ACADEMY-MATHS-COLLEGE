import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Section } from "@/components/ui/Section";
import { academyLinks, academySocialLinks } from "@/lib/academy-links";

export function CallToAction({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const socialLabel = locale === "ar" ? "تابعنا وتواصل معنا" : "Suivez-nous et contactez-nous";

  return (
    <Section id="subscriber-access" className="border-t border-accent/10 bg-[#050b13]">
      <div className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-gradient-to-br from-[#0c1b2a] via-[#07111c] to-[#050b13] p-7 sm:p-9 lg:p-12">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{dict.cta.eyebrow}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{dict.cta.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">{dict.cta.description}</p>

            <div className="mt-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">{socialLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {academySocialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-white/10 bg-white/[0.025] px-3.5 py-2 text-xs font-black text-chalk-dim transition hover:border-accent/50 hover:text-accent"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:flex-col">
            <a href={academyLinks.whatsapp} target="_blank" rel="noreferrer noopener" className="brand-button inline-flex min-w-44 items-center justify-center gap-3 rounded-lg px-6 py-3.5 text-sm font-black">
              WhatsApp<span aria-hidden="true">←</span>
            </a>
            <Link href={`/${locale}/login`} className="inline-flex min-w-44 items-center justify-center rounded-lg border border-white/15 bg-white/[0.025] px-6 py-3.5 text-sm font-bold text-chalk transition hover:border-accent/40 hover:text-accent">
              {dict.cta.primary}
            </Link>
            <a href="#programmes" className="inline-flex min-w-44 items-center justify-center rounded-lg border border-white/15 bg-white/[0.025] px-6 py-3.5 text-sm font-bold text-chalk transition hover:border-accent/40 hover:text-accent">
              {dict.cta.secondary}
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}
