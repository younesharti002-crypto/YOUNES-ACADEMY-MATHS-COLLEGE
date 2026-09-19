import type { Dictionary } from "@/i18n/dictionaries";
import { INSTAGRAM_URL, Section } from "@/components/ui/Section";

export function InstagramFeed({ dict }: { dict: Dictionary }) {
  const { instagram } = dict;

  return (
    <Section id="instagram" className="relative overflow-hidden bg-[#07111c]">
      <div className="premium-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{instagram.eyebrow}</p>
            <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{instagram.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">{instagram.description}</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="brand-button mt-7 inline-flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-black">
              {instagram.cta}<span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-[#050b13]/70 p-5 sm:p-6">
            <div className="border-b border-white/[0.07] pb-4">
              <p className="brand-text text-xl font-black">{instagram.handle}</p>
              <p className="mt-1 text-xs text-chalk-dim">Education · Oulfa · Casablanca</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {instagram.posts.map((post) => (
                <a key={post.title} href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 transition hover:border-accent/20">
                  <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-accent">{post.tag}</span><span className="text-[9px] text-chalk-dim/60">{post.kind}</span></div>
                  <p className="mt-2 text-xs font-bold leading-5 text-chalk-dim">{post.title}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
