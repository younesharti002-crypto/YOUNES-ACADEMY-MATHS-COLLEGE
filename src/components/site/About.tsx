import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionaries";
import { ABOUT_SRC, Section } from "@/components/ui/Section";

export function About({ dict }: { dict: Dictionary }) {
  const { about } = dict;

  return (
    <Section id="about" className="border-y border-accent/10 bg-[#050b13]">
      <div className="premium-panel relative overflow-hidden rounded-[2rem] p-4 sm:p-6 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute end-[-8rem] top-[-8rem] size-80 rounded-full border border-accent/[0.07]" />
        <div className="relative grid gap-7 lg:grid-cols-[330px_minmax(0,1fr)] lg:items-stretch">
          <figure className="portrait-frame relative min-h-[390px] overflow-hidden rounded-[1.5rem] sm:min-h-[450px]">
            <Image
              src={ABOUT_SRC}
              alt={dict.hero.imageAlt}
              fill
              unoptimized
              sizes="(max-width: 1024px) 85vw, 330px"
              className="object-cover object-top"
            />
            <figcaption className="absolute inset-x-0 bottom-0 z-10 p-5">
              <span className="inline-flex rounded-full border border-accent/30 bg-[#050b13]/80 px-3 py-1.5 text-xs font-black text-accent backdrop-blur">
                {dict.hero.name}
              </span>
            </figcaption>
          </figure>

          <div className="flex flex-col justify-center py-3 lg:px-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-accent/70" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{about.eyebrow}</p>
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{about.title}</h2>

            <div className="mt-5 max-w-3xl space-y-3">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-chalk-dim sm:text-base">
                  {paragraph}
                </p>
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
