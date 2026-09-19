import type { Dictionary } from "@/i18n/dictionaries";
import { Section, SectionHeading } from "@/components/ui/Section";

export function Positioning({ dict }: { dict: Dictionary }) {
  const { positioning } = dict;
  const columns = [
    { data: positioning.physics, symbol: "🏫", label: "PRÉSENTIEL" },
    { data: positioning.chemistry, symbol: "📱", label: "DIGITAL" },
  ];

  return (
    <Section id="positioning" className="relative overflow-hidden bg-[#07111c]">
      <div className="relative grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <SectionHeading eyebrow={positioning.eyebrow} title={positioning.title} lead={positioning.lead} />
        <div className="grid gap-4 sm:grid-cols-2">
          {columns.map(({ data, symbol, label }, index) => (
            <article key={data.title} className={`rounded-[1.7rem] border p-6 ${index === 0 ? "border-accent/25 bg-accent/[0.07]" : "border-white/10 bg-white/[0.04]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-accent/75">{label}</p>
                  <h3 className="mt-2 text-xl font-black text-chalk">{data.title}</h3>
                </div>
                <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-xl">{symbol}</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-chalk-dim">{data.description}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {data.items.map((item) => (
                  <li key={item} className="rounded-full border border-white/10 bg-[#050b13]/65 px-3 py-1.5 text-[11px] font-bold text-chalk-dim">
                    {item}
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
