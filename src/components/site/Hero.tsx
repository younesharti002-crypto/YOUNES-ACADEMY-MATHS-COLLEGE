import Image from "next/image";
import type { Dictionary } from "@/i18n/dictionaries";
import { PORTRAIT_SRC } from "@/components/ui/Section";

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section className="graph-paper relative overflow-hidden border-b border-accent/15 bg-[#050b13]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,rgba(18,214,208,0.12),transparent_26rem)]" />
      <div aria-hidden="true" className="pointer-events-none absolute end-[4%] top-24 size-[30rem] rounded-full border border-accent/[0.06]" />
      <div aria-hidden="true" className="pointer-events-none absolute end-[9%] top-40 size-[19rem] rounded-full border border-accent/[0.08]" />

      <div className="premium-hero-grid relative mx-auto grid w-full max-w-[90rem] gap-8 px-5 pb-10 pt-7 sm:px-8 md:pb-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-14 lg:px-10 lg:pb-0 lg:pt-0">
        <div className="relative mx-auto w-full max-w-[31rem] self-stretch lg:mx-0 lg:max-w-none">
          <div aria-hidden="true" className="absolute inset-x-[8%] bottom-[5%] top-[12%] rounded-[2rem] bg-accent/10 blur-3xl" />
          <figure className="portrait-frame relative aspect-[4/5] min-h-[34rem] w-full rounded-b-none border-b-0 lg:min-h-[46rem] lg:rounded-t-none">
            <Image
              src={PORTRAIT_SRC}
              alt={dict.hero.imageAlt}
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 90vw, 45vw"
              className="object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-[#050b13]/80 px-3 py-2 text-xs font-bold text-accent backdrop-blur-xl">
                <span className="size-1.5 rounded-full bg-accent" />
                {dict.hero.imageCaption}
              </div>
            </div>
          </figure>
        </div>

        <div className="premium-hero-copy py-8 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/[0.07] px-4 py-2 text-xs font-bold text-accent-soft">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {dict.hero.badge}
          </div>

          <h1 className="mt-7 max-w-3xl text-[2.45rem] font-black leading-[1.12] tracking-[-0.02em] text-chalk sm:text-5xl md:text-[4rem] md:leading-[1.08]">
            {dict.hero.title}
          </h1>

          <p className="brand-text mt-4 text-lg font-black sm:text-2xl">{dict.hero.name}</p>

          <p className="mt-6 max-w-2xl text-base leading-8 text-chalk-dim md:text-lg">
            {dict.hero.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#subscriber-access"
              className="brand-button inline-flex items-center gap-3 rounded-lg px-6 py-3.5 text-sm font-black transition hover:-translate-y-0.5 hover:brightness-105"
            >
              {dict.hero.primaryCta}
              <span aria-hidden="true">←</span>
            </a>
            <a
              href="#cours"
              className="inline-flex items-center gap-3 rounded-lg border border-accent/45 bg-white/[0.02] px-6 py-3.5 text-sm font-bold text-chalk transition hover:border-accent hover:bg-accent/[0.07]"
            >
              <span className="grid size-5 place-items-center rounded-full border border-white/25 text-[9px]" aria-hidden="true">▶</span>
              {dict.hero.secondaryCta}
            </a>
          </div>

          <dl className="premium-panel mt-10 grid max-w-3xl grid-cols-1 divide-y divide-white/[0.07] overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:[direction:ltr]">
            {dict.hero.stats.map((stat) => (
              <div key={stat.label} className="px-5 py-5 text-center [direction:inherit]">
                <dd className="brand-text text-2xl font-black">{stat.value}</dd>
                <dt className="mt-1 text-xs leading-relaxed text-chalk-dim">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
