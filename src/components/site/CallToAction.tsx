import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Section } from "@/components/ui/Section";

export function CallToAction({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <Section id="subscriber-access" className="border-t border-accent/10 bg-[#050b13]">
      <div className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-gradient-to-br from-[#0c1b2a] via-[#07111c] to-[#050b13] p-7 sm:p-9 lg:p-12">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{dict.cta.eyebrow}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{dict.cta.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-chalk-dim sm:text-base">{dict.cta.description}</p>
          </div>

          <div className="flex flex-wrap gap-3 lg:flex-col">
            <Link href={`/${locale}/login`} className="brand-button inline-flex min-w-44 items-center justify-center gap-3 rounded-lg px-6 py-3.5 text-sm font-black">
              {dict.cta.primary}<span aria-hidden="true">←</span>
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
