"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/70 focus:bg-white/[0.07]";

async function adminPeopleApi(body: Record<string, unknown>) {
  const response = await fetch("/api/v1/admin/people", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Operation failed");
  }

  return payload;
}

export function CreateTeacherForm({ locale }: { locale: "ar" | "fr" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ar = locale === "ar";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage("");
    setError("");

    try {
      await adminPeopleApi({
        action: "createTeacher",
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        password: formData.get("password"),
        preferredLanguage: formData.get("preferredLanguage") || locale,
        bio: formData.get("bio"),
      });

      form.reset();
      setMessage(ar ? "تم إنشاء حساب الأستاذ بنجاح." : "Compte professeur créé avec succès.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-accent/25 bg-accent/[0.07] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-black text-accent">
          {ar ? "إضافة أستاذ جديد" : "Ajouter un nouveau professeur"}
        </p>
        <h2 className="mt-1 text-2xl font-black">
          {ar ? "إنشاء حساب الأستاذ مباشرة" : "Créer le compte professeur directement"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-chalk-dim">
          {ar
            ? "كتب الاسم، رقم واتساب، وكلمة السر الأولية. من بعد غادي يبان الأستاذ فالقائمة وتقدر تربطو بالحصة من التخطيط."
            : "Saisissez le nom, le WhatsApp et le mot de passe initial. Le professeur apparaîtra ensuite dans la liste et pourra être affecté au planning."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            {ar ? "اسم الأستاذ" : "Nom du professeur"}
          </label>
          <input
            name="fullName"
            required
            className={inputClass}
            placeholder={ar ? "مثال: Prof Ahmed" : "Exemple : Prof Ahmed"}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            WhatsApp
          </label>
          <input
            name="phone"
            required
            inputMode="tel"
            className={inputClass}
            placeholder="06XXXXXXXX"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            {ar ? "كلمة السر الأولية" : "Mot de passe initial"}
          </label>
          <input
            name="password"
            required
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={inputClass}
            placeholder="8 caractères min."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            {ar ? "اللغة" : "Langue"}
          </label>
          <select name="preferredLanguage" defaultValue={locale} className={inputClass}>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="lg:col-span-3">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
            {ar ? "التخصص / ملاحظة" : "Spécialité / note"}
          </label>
          <input
            name="bio"
            className={inputClass}
            placeholder={ar ? "مثال: Mathématiques collège" : "Exemple : Mathématiques collège"}
          />
        </div>
        <div className="flex items-end">
          <button
            disabled={isPending}
            className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-black text-board-900 transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? ar
                ? "جاري الإنشاء..."
                : "Création..."
              : ar
                ? "إنشاء الأستاذ"
                : "Créer le professeur"}
          </button>
        </div>
      </form>

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-red-300/25 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
