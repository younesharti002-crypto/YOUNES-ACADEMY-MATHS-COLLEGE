"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";

type LeadConvertFormProps = {
  locale: Locale;
  leadId: string;
  lead: {
    fullName: string;
    phone: string;
    level: string;
    subject: string;
  };
};

type SubmitState = "idle" | "loading" | "success" | "error";

type ConvertResult = {
  studentUser?: { fullName: string; phone: string };
  parentUser?: { fullName: string; phone: string };
  studentProfile?: { studentCode: string };
  tempPassword?: string;
};

function suggestedStudentPhone(parentPhone: string) {
  return parentPhone.replace(/\D/g, "").endsWith("0") ? "" : "";
}

export function LeadConvertForm({ locale, leadId, lead }: LeadConvertFormProps) {
  const rtl = locale === "ar";
  const [studentName, setStudentName] = useState(lead.fullName);
  const [studentPhone, setStudentPhone] = useState(suggestedStudentPhone(lead.phone));
  const [parentName, setParentName] = useState(`Parent ${lead.fullName}`);
  const [parentPhone, setParentPhone] = useState(lead.phone);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ConvertResult | null>(null);

  const generatedPasswordNote = useMemo(
    () =>
      rtl
        ? "خليه خاوي باش النظام يولّد كلمة سر مؤقتة تلقائياً."
        : "Laissez vide pour générer automatiquement un mot de passe temporaire.",
    [rtl],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setErrorMessage("");
    setResult(null);

    const response = await fetch(`/api/v1/admin/leads/${leadId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName,
        studentPhone,
        parentName,
        parentPhone,
        password,
        preferredLanguage: locale,
      }),
    }).catch(() => null);

    const json = (await response?.json().catch(() => null)) as
      | { ok?: boolean; data?: ConvertResult; error?: { message?: string } }
      | null;

    if (response?.ok && json?.ok) {
      setResult(json.data || null);
      setState("success");
      return;
    }

    setState("error");
    setErrorMessage(
      json?.error?.message ||
        (rtl
          ? "تعذر إنشاء الحساب. تأكد من الأرقام وأنها غير مستعملة من قبل."
          : "Impossible de créer le compte. Vérifiez les numéros et les doublons."),
    );
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
          {rtl ? "الطلب الأصلي" : "Demande initiale"}
        </p>
        <h2 className="mt-4 text-2xl font-black text-chalk">{lead.fullName}</h2>
        <div className="mt-5 grid gap-3 text-sm text-chalk-dim">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <span className="font-black text-accent">WhatsApp:</span> {lead.phone}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <span className="font-black text-accent">Niveau:</span> {lead.level}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <span className="font-black text-accent">Matière:</span> {lead.subject}
          </div>
        </div>

        <p className="mt-5 text-xs leading-6 text-white/45">
          {rtl
            ? "مهم: رقم التلميذ خاصو يكون مختلف على رقم ولي الأمر، لأن كل واحد غادي يدخل للمنصة برقم خاص به."
            : "Important : le numéro élève doit être différent du numéro parent, car chaque compte se connecte avec son propre téléphone."}
        </p>
      </aside>

      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-accent/25 bg-white/[0.055] p-6 shadow-2xl shadow-black/20">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
          {rtl ? "إنشاء الحسابات" : "Création des comptes"}
        </p>
        <h2 className="mt-3 text-2xl font-black text-chalk">
          {rtl ? "حوّل الطلب إلى تلميذ رسمي" : "Transformer en élève officiel"}
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-chalk-dim sm:col-span-2">
            {rtl ? "اسم التلميذ" : "Nom élève"}
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              required
              className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/50"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-chalk-dim">
            {rtl ? "رقم التلميذ" : "Téléphone élève"}
            <input
              value={studentPhone}
              onChange={(event) => setStudentPhone(event.target.value)}
              required
              inputMode="tel"
              placeholder="06XXXXXXXX"
              className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/50"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-chalk-dim">
            {rtl ? "رقم ولي الأمر" : "Téléphone parent"}
            <input
              value={parentPhone}
              onChange={(event) => setParentPhone(event.target.value)}
              required
              inputMode="tel"
              className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/50"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-chalk-dim sm:col-span-2">
            {rtl ? "اسم ولي الأمر" : "Nom parent"}
            <input
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              required
              className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/50"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-chalk-dim sm:col-span-2">
            {rtl ? "كلمة سر مؤقتة" : "Mot de passe temporaire"}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              placeholder={rtl ? "اختياري" : "Optionnel"}
              className="rounded-2xl border border-white/10 bg-[#03080f] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/50"
            />
            <span className="text-[11px] text-white/40">{generatedPasswordNote}</span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={state === "loading" || state === "success"}
            className="brand-button inline-flex min-w-44 items-center justify-center rounded-lg px-6 py-3.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "loading"
              ? rtl
                ? "جاري الإنشاء..."
                : "Création..."
              : rtl
                ? "أنشئ الحسابات"
                : "Créer les comptes"}
          </button>
          <Link href={`/${locale}/admin/leads`} className="inline-flex min-w-36 items-center justify-center rounded-lg border border-white/15 px-6 py-3.5 text-sm font-bold text-white/75 transition hover:bg-white/5">
            {rtl ? "رجوع" : "Retour"}
          </Link>
        </div>

        {state === "error" ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm font-bold text-red-100">
            {errorMessage}
          </p>
        ) : null}

        {state === "success" && result ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
            <p className="font-black text-emerald-200">
              {rtl ? "تم إنشاء الحسابات بنجاح" : "Comptes créés avec succès"}
            </p>
            <div className="mt-3 grid gap-2 text-xs leading-6">
              <p><span className="font-black">Code:</span> {result.studentProfile?.studentCode}</p>
              <p><span className="font-black">Student:</span> {result.studentUser?.phone}</p>
              <p><span className="font-black">Parent:</span> {result.parentUser?.phone}</p>
              <p><span className="font-black">Password:</span> {result.tempPassword}</p>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}
