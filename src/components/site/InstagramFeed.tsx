import type { Dictionary } from "@/i18n/dictionaries";
import { INSTAGRAM_URL, Section } from "@/components/ui/Section";

function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.5.01-4.74.07-.9.04-1.39.19-1.72.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.33-.28.82-.32 1.72C3.41 9.1 3.4 9.46 3.4 12.6s.01 3.5.07 4.74c.04.9.19 1.39.32 1.72.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.13.82.28 1.72.32 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.39-.19 1.72-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.33.28-.82.32-1.72.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.39-.32-1.72a2.9 2.9 0 0 0-.69-1.06 2.9 2.9 0 0 0-1.06-.69c-.33-.13-.82-.28-1.72-.32C15.5 4.01 15.14 4 12 4Z" />
      <path d="M12 7.15a4.85 4.85 0 1 0 0 9.7 4.85 4.85 0 0 0 0-9.7Zm0 8a3.15 3.15 0 1 1 0-6.3 3.15 3.15 0 0 1 0 6.3Z" />
      <circle cx="17.05" cy="6.95" r="1.13" />
    </svg>
  );
}

export function InstagramFeed({ dict }: { dict: Dictionary }) {
  const { instagram } = dict;

  return (
    <Section id="instagram" className="relative overflow-hidden bg-[#07111c]">
      <div aria-hidden="true" className="pointer-events-none absolute end-[-7rem] top-[-5rem] size-80 rounded-full border border-accent/[0.07]" />
      <div className="premium-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl border border-accent/25 bg-accent/[0.08] text-accent"><InstagramGlyph className="size-5" /></span><p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{instagram.eyebrow}</p></div>
            <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-chalk sm:text-4xl">{instagram.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">{instagram.description}</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="brand-button mt-7 inline-flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-black">
              <InstagramGlyph className="size-4" />
              {instagram.cta}
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-[#050b13]/70 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div><p className="brand-text text-xl font-black">{instagram.handle}</p><p className="mt-1 text-xs text-chalk-dim">Mathématiques · Collège · Maroc</p></div>
              <span className="grid size-12 place-items-center rounded-full border border-accent/25 bg-accent/[0.08] text-accent"><InstagramGlyph className="size-5" /></span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {instagram.posts.map((post) => (
                <a key={post.title} href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 transition hover:border-accent/20 hover:bg-accent/[0.035]">
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
