import type { academySocialLinks } from "@/lib/academy-links";

type SocialKey = (typeof academySocialLinks)[number]["key"];

export function SocialIcon({ name, className = "size-4" }: { name: SocialKey; className?: string }) {
  if (name === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.1 19.2 6 15.8A7.4 7.4 0 1 1 9 18.8l-3.9.4Z" />
        <path d="M9.2 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.5c.5.9 1.2 1.6 2.2 2.1l.5-.5c.2-.2.4-.3.7-.2l1.5.7c.3.1.4.3.4.6v.5c0 .4-.2.7-.5.9-.6.3-1.5.3-2.7-.1-1.5-.5-2.8-1.4-3.8-2.5s-1.7-2.2-1.9-3.2c-.2-.8 0-1.4.2-2Z" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M14.1 8.1h2.1V4.7c-.4-.1-1.6-.2-3-.2-3 0-5 1.8-5 5.1v2.9H4.9v3.8h3.3V24h4v-7.7h3.3l.5-3.8h-3.8V10c0-1.1.3-1.9 1.9-1.9Z" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r=".7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M14.9 3.2c.5 2.2 1.8 3.6 4.1 3.8v3.1c-1.3.1-2.6-.3-3.8-1v5.8c0 3.8-2.4 6.3-6 6.3-3.3 0-5.7-2.2-5.7-5.4 0-3.5 2.7-5.8 6.5-5.3v3.3c-1.7-.5-3 .4-3 1.9 0 1.3.9 2.2 2.2 2.2 1.5 0 2.4-.9 2.4-3V3.2h3.3Z" />
    </svg>
  );
}
