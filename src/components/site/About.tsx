import type { Dictionary } from "@/i18n/dictionaries";
import { Section } from "@/components/ui/Section";

export function About({ dict }: { dict: Dictionary }) {
  const { about } = dict;

  return (
    <Section id="about" className="border-y border-accent/10 bg-[#050b13]">
      <div className="premium-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["4", "Salles"],
              ["35–40", "Élèves / salle"],
              ["1h30", "Par séance"],
              ["Oulfa", "Casablanca"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-3xl font-black text-accent">{value}</p>
                <p className="mt-2 text-xs font-bold text-chalk-dim">{label}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-accent/70" />
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{about.eyebrow}</p>
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{about.title}</h2>
            <div className="mt-5 max-w-3xl space-y-3">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-chalk-dim sm:text-base">{paragraph}</p>
              ))}
            </div>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {about.points.map((point, index) => (
                <li key={point} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <span className="grid size-9 place-items-center rounded-xl border border-accent/20 bg-accent/[0.08] text-xs font-black text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 text-sm font-bold leading-6 text-chalk">{point}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
