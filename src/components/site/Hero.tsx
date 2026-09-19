import type { Dictionary } from "@/i18n/dictionaries";

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section className="graph-paper relative overflow-hidden border-b border-accent/15 bg-[#050b13]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(18,214,208,0.10),transparent_28rem)]" />
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[.94fr_1.06fr] lg:items-center lg:px-10 lg:py-16">
        <div>
          <img
            src="/brand/secret-academy-logo.svg"
            alt="THE SECRET ACADEMY | سرك للتفوق"
            className="mb-6 h-24 w-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:h-32"
          />

          <div className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/[0.07] px-4 py-2 text-xs font-bold text-accent-soft">
            <span className="size-1.5 rounded-full bg-accent" />
            {dict.hero.badge}
          </div>

          <h1 className="mt-7 max-w-4xl text-[2.45rem] font-black leading-[1.08] tracking-[-0.02em] text-chalk sm:text-5xl md:text-[3.85rem]">
            {dict.hero.title}
          </h1>

          <p className="brand-text mt-4 text-xl font-black sm:text-2xl">{dict.hero.name}</p>

          <p className="mt-6 max-w-2xl text-base leading-8 text-chalk-dim md:text-lg">
            {dict.hero.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#programmes" className="brand-button inline-flex items-center gap-3 rounded-lg px-6 py-3.5 text-sm font-black">
              {dict.hero.primaryCta}<span aria-hidden="true">←</span>
            </a>
            <a href="#parents" className="inline-flex items-center gap-3 rounded-lg border border-accent/45 bg-white/[0.02] px-6 py-3.5 text-sm font-bold text-chalk transition hover:border-accent hover:bg-accent/[0.07]">
              {dict.hero.secondaryCta}
            </a>
          </div>

          <dl className="premium-panel mt-10 grid max-w-3xl grid-cols-1 divide-y divide-white/[0.07] overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {dict.hero.stats.map((stat) => (
              <div key={stat.label} className="px-5 py-5 text-center">
                <dd className="brand-text text-2xl font-black">{stat.value}</dd>
                <dt className="mt-1 text-xs leading-relaxed text-chalk-dim">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-accent/25 bg-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <img
              src="/brand/secret-academy-bac-banner.svg"
              alt="Spécial BAC — THE SECRET ACADEMY"
              className="block h-auto w-full"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Primaire", value: "100 DH", text: "4AP · 5AP · 6AP" },
              { title: "Collège", value: "200 DH", text: "1AC · 2AC · 3AC" },
              { title: "Lycée", value: "200 DH", text: "TC · 1BAC · 2BAC" },
            ].map((item, index) => (
              <article key={item.title} className={`rounded-2xl border p-4 ${index === 2 ? "border-accent/30 bg-accent/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">{item.title}</p>
                <p className="mt-2 text-sm font-black text-chalk">{item.text}</p>
                <p className="mt-3 text-xl font-black text-accent">{item.value}</p>
                <p className="text-[10px] text-chalk-dim">/ matière / mois</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
