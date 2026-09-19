"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { academyLinks } from "@/lib/academy-links";

type SubmitState = "idle" | "loading" | "success" | "error";

const levels = ["4AP", "5AP", "6AP", "1AC", "2AC", "3AC", "TC", "1BAC", "2BAC SVT", "2BAC PC", "2BAC ECO"];
const subjects = ["Maths", "Français", "Arabe", "PC", "SVT", "Anglais", "HG", "Comptabilité", "Économie générale"];

export function RegistrationLeadSection({ locale }: { locale: Locale }) {
  const isAr = locale === "ar";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("2BAC SVT");
  const [subject, setSubject] = useState("Maths");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  const whatsappHref = useMemo(() => {
    const text = isAr
      ? `Salam, bghit nsjel f THE SECRET ACADEMY. Ism: ${fullName || "___"}. Niveau: ${level}. Matiere: ${subject}. Tel: ${phone || "___"}`
      : `Bonjour, je veux inscrire un élève à THE SECRET ACADEMY. Nom: ${fullName || "___"}. Niveau: ${level}. Matière: ${subject}. Tél: ${phone || "___"}`;
    return `${academyLinks.whatsapp}?text=${encodeURIComponent(text)}`;
  }, [fullName, isAr, level, phone, subject]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    const response = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, level, subject, message, source: "landing_page" }),
    }).catch(() => null);

    if (response?.ok) {
      setState("success");
      return;
    }

    setState("error");
  }

  return (
    <section id="inscription" className="border-t border-accent/10 bg-[#050b13] px-5 py-14 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
            {isAr ? "طلب التسجيل" : "Demande d’inscription"}
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-chalk sm:text-4xl">
            {isAr ? "خلي معلوماتك ونعاودو نتاصلو بك بسرعة" : "Laissez vos informations, on vous contacte rapidement"}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-chalk-dim sm:text-base">
            {isAr
              ? "هاد الطلب كيوصل مباشرة للإدارة. من بعد كنأكدو المستوى، المادة، التوقيت، وكنحوّلو التلميذ لحساب رسمي فالمِنصة."
              : "La demande arrive directement à l’administration. Ensuite, on confirme le niveau, la matière, l’horaire et on crée le compte officiel dans la plateforme."}
          </p>

          <div className="mt-6 grid gap-3 text-sm text-chalk-dim">
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.06] p-4">
              <span className="font-black text-accent">1.</span> {isAr ? "تسجيل الطلب" : "Demande enregistrée"}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <span className="font-black text-accent">2.</span> {isAr ? "اتصال واتساب للتأكيد" : "Confirmation par WhatsApp"}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <span className="font-black text-accent">3.</span> {isAr ? "إنشاء حساب التلميذ وولي الأمر" : "Création du compte élève et parent"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-accent/25 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold text-chalk-dim sm:col-span-2">
              {isAr ? "اسم ولي الأمر أو التلميذ" : "Nom du parent ou de l’élève"}
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none transition focus:border-accent/50"
                placeholder={isAr ? "مثال: ياسين أحمد" : "Exemple : Yassine Ahmed"}
              />
            </label>

            <label className="grid gap-2 text-xs font-bold text-chalk-dim">
              {isAr ? "رقم الهاتف / واتساب" : "Téléphone / WhatsApp"}
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                inputMode="tel"
                className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none transition focus:border-accent/50"
                placeholder="0644344034"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold text-chalk-dim">
              {isAr ? "المستوى" : "Niveau"}
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none transition focus:border-accent/50"
              >
                {levels.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold text-chalk-dim">
              {isAr ? "المادة" : "Matière"}
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none transition focus:border-accent/50"
              >
                {subjects.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold text-chalk-dim sm:col-span-2">
              {isAr ? "ملاحظة اختيارية" : "Note optionnelle"}
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none transition focus:border-accent/50"
                placeholder={isAr ? "مثال: بغيتو يبدأ هاد الأسبوع" : "Exemple : démarrage souhaité cette semaine"}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={state === "loading"}
              className="brand-button inline-flex min-w-40 items-center justify-center rounded-lg px-6 py-3.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? (isAr ? "جاري الإرسال..." : "Envoi...") : isAr ? "أرسل الطلب" : "Envoyer la demande"}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-40 items-center justify-center rounded-lg border border-accent/45 bg-accent/10 px-6 py-3.5 text-sm font-black text-accent transition hover:bg-accent hover:text-board-900"
            >
              WhatsApp
            </a>
          </div>

          {state === "success" ? (
            <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-200">
              {isAr ? "تم تسجيل الطلب بنجاح. الإدارة غادي تتاصل بك." : "Demande enregistrée. L’administration vous contactera."}
            </p>
          ) : null}

          {state === "error" ? (
            <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm font-bold text-red-100">
              {isAr ? "وقع مشكل فالإرسال. استعمل WhatsApp مباشرة." : "Un problème est survenu. Utilisez WhatsApp directement."}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
