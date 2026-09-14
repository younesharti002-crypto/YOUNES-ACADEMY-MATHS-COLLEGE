import type { ReactNode } from "react";

export const INSTAGRAM_URL = "https://instagram.com/younes.digital7";

export const PORTRAIT_SRC = "/images/younes-portrait.jpg";
export const ABOUT_SRC = "/images/younes-about.jpg";

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 px-5 py-16 sm:px-8 md:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-accent/70" aria-hidden="true" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      </div>
      <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.015em] text-chalk sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">{lead}</p> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
