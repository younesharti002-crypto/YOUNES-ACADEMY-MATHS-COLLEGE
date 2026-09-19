import type { Dictionary } from "@/i18n/dictionaries";
import { Section } from "@/components/ui/Section";

const featureIcons = ["◫", "▣", "◆", "◎"];

export function Offers({ dict }: { dict: Dictionary }) {
  return (
    <Section id="programmes" className="relative overflow-hidden bg-[#07111c]">
      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3"><span className="h-px w-9 bg-accent/70" /><p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">THE SECRET ACADEMY</p></div>
            <h2 className="mt-4 text-3xl font-black leading-tight text-chalk sm:text-4xl">{dict.why.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">{dict.cta.title}</p>
          </div>
          <div className="inline-flex w-fit rounded-full border border-accent/20 bg-accent/[0.06] px-4 py-2 text-xs font-black text-accent">
            Primaire · Collège · Lycée
          </div>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dict.offers.map((offer, index) => (
            <article key={offer.id} id={offer.id} className="scroll-mt-28 rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-accent/25">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-lg font-black text-accent">{featureIcons[index]}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-chalk-dim/60">0{index + 1}</span>
              </div>
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-accent">{offer.eyebrow}</p>
              <h3 className="mt-2 text-lg font-black leading-7 text-chalk">{offer.title}</h3>
              <p className="mt-3 text-sm leading-7 text-chalk-dim">{offer.description}</p>
              <ul className="mt-5 space-y-2 border-t border-white/[0.07] pt-4">
                {offer.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-5 text-chalk-dim">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
