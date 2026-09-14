import type { Dictionary } from "@/i18n/dictionaries";
import { Section, SectionHeading } from "@/components/ui/Section";

export function WhyChoose({ dict }: { dict: Dictionary }) {
  const { why } = dict;

  return (
    <Section id="why" className="border-y border-accent/10 bg-[#050b13]">
      <div className="grid gap-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <SectionHeading eyebrow={why.eyebrow} title={why.title} />
          <div className="mt-6 h-px w-24 bg-gradient-to-r from-accent to-transparent" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {why.items.map((item, index) => (
            <article
              key={item.title}
              className="group rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 transition duration-300 hover:border-accent/25 hover:bg-accent/[0.035]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-xs font-black text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-lg text-accent/50 transition-transform group-hover:-translate-x-1" aria-hidden="true">←</span>
              </div>
              <h3 className="mt-5 text-base font-black text-chalk sm:text-lg">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-chalk-dim">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
