import type { Dictionary } from "@/i18n/dictionaries";
import { Section } from "@/components/ui/Section";

const featureIcons = ["▣", "◉", "▶", "✎"];

export function Offers({ dict }: { dict: Dictionary }) {
  return (
    <Section id="platform-features" className="relative overflow-hidden bg-[#07111c]">
      <div aria-hidden="true" className="pointer-events-none absolute end-[-10rem] top-20 size-96 rounded-full bg-accent/[0.045] blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3"><span className="h-px w-9 bg-accent/70" /><p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">YOUNES ACADEMY</p></div>
            <h2 className="mt-4 text-3xl font-black leading-tight text-chalk sm:text-4xl">
              {dict.why.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">
              {dict.cta.title}
            </p>
          </div>
          <div className="inline-flex w-fit rounded-full border border-accent/20 bg-accent/[0.06] px-4 py-2 text-xs font-black text-accent">
            1AC · 2AC · 3AC · Mathématiques
          </div>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dict.offers.map((offer, index) => (
            <article
              key={offer.id}
              id={offer.id}
              className="group relative scroll-mt-28 overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.018] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.17)] transition duration-300 hover:-translate-y-1 hover:border-accent/25"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-lg font-black text-accent">
                  {featureIcons[index] || "•"}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-chalk-dim/60">0{index + 1}</span>
              </div>
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-accent">{offer.eyebrow}</p>
              <h3 className="mt-2 text-lg font-black leading-7 text-chalk">{offer.title}</h3>
              <p className="mt-3 text-sm leading-7 text-chalk-dim">{offer.description}</p>
              <ul className="mt-5 space-y-2 border-t border-white/[0.07] pt-4">
                {offer.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-5 text-chalk-dim">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -end-20 size-44 rounded-full border border-accent/[0.06] transition-transform duration-500 group-hover:scale-110" />
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
