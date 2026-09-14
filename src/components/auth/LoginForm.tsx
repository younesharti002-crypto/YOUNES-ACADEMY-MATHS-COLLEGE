"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Locale = "ar" | "fr";

type SafeUser = {
  id: string;
  fullName: string;
  phone: string;
  role: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  preferredLanguage: "ar" | "fr";
};

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  phoneLabel: string;
  phonePlaceholder: string;
  passwordLabel: string;
  submit: string;
  submitting: string;
  logout: string;
  loggingOut: string;
  adminNote: string;
  successTitle: string;
  successBody: string;
  backHome: string;
  invalidCredentials: string;
  disabled: string;
  invalidRequest: string;
  unavailable: string;
};

const copy: Record<Locale, Copy> = {
  ar: {
    eyebrow: "فضاء المشتركين",
    title: "تسجيل الدخول",
    description: "استعمل رقم واتساب وكلمة المرور اللذين تم تفعيلهما من طرف الإدارة.",
    phoneLabel: "رقم واتساب",
    phonePlaceholder: "06XXXXXXXX أو +2126XXXXXXXX",
    passwordLabel: "كلمة المرور",
    submit: "دخول",
    submitting: "جاري التحقق...",
    logout: "تسجيل الخروج",
    loggingOut: "جاري تسجيل الخروج...",
    adminNote: "لا يوجد تسجيل ذاتي للطلاب. الحسابات تُنشأ وتُفعّل من طرف الإدارة بعد تأكيد الاشتراك.",
    successTitle: "تم تسجيل الدخول بنجاح",
    successBody: "الجلسة آمنة وفعالة. أصبح الحساب جاهزاً للانتقال إلى فضاء المشترك.",
    backHome: "العودة للرئيسية",
    invalidCredentials: "رقم واتساب أو كلمة المرور غير صحيحة.",
    disabled: "هذا الحساب موقوف. تواصل مع الإدارة.",
    invalidRequest: "تحقق من رقم واتساب وكلمة المرور.",
    unavailable: "خدمة تسجيل الدخول غير متاحة مؤقتاً. حاول من جديد.",
  },
  fr: {
    eyebrow: "Espace abonnés",
    title: "Connexion",
    description: "Utilisez le numéro WhatsApp et le mot de passe activés par l’administration.",
    phoneLabel: "Numéro WhatsApp",
    phonePlaceholder: "06XXXXXXXX ou +2126XXXXXXXX",
    passwordLabel: "Mot de passe",
    submit: "Se connecter",
    submitting: "Vérification...",
    logout: "Se déconnecter",
    loggingOut: "Déconnexion...",
    adminNote: "Il n’y a pas d’inscription libre. Les comptes sont créés et activés par l’administration après confirmation de l’abonnement.",
    successTitle: "Connexion réussie",
    successBody: "La session sécurisée est active. Le compte est prêt pour l’espace abonné.",
    backHome: "Retour à l’accueil",
    invalidCredentials: "Numéro WhatsApp ou mot de passe incorrect.",
    disabled: "Ce compte est désactivé. Contactez l’administration.",
    invalidRequest: "Vérifiez le numéro WhatsApp et le mot de passe.",
    unavailable: "La connexion est temporairement indisponible. Réessayez.",
  },
};

function getErrorMessage(locale: Locale, code?: string): string {
  const text = copy[locale];

  if (code === "INVALID_CREDENTIALS") return text.invalidCredentials;
  if (code === "ACCOUNT_DISABLED") return text.disabled;
  if (code === "INVALID_REQUEST") return text.invalidRequest;
  return text.unavailable;
}

export function LoginForm({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUser(null);
    setSubmitting(true);

    try {
      const loginResponse = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });

      const loginPayload = (await loginResponse.json()) as {
        error?: { code?: string };
      };

      if (!loginResponse.ok) {
        setError(getErrorMessage(locale, loginPayload.error?.code));
        return;
      }

      const sessionResponse = await fetch("/api/v1/auth/me", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const sessionPayload = (await sessionResponse.json()) as {
        data?: { user?: SafeUser };
      };

      if (!sessionResponse.ok || !sessionPayload.data?.user) {
        setError(text.unavailable);
        return;
      }

      setUser(sessionPayload.data.user);
      setPassword("");
    } catch {
      setError(text.unavailable);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setLoggingOut(true);

    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setError(text.unavailable);
        return;
      }

      setUser(null);
      setPhone("");
      setPassword("");
    } catch {
      setError(text.unavailable);
    } finally {
      setLoggingOut(false);
    }
  }

  if (user) {
    const destination = user.role === "ADMIN" ? `/${locale}/admin/academic` : `/${locale}/dashboard`;
    const destinationLabel =
      user.role === "ADMIN"
        ? locale === "ar"
          ? "فتح لوحة الإدارة"
          : "Ouvrir l’administration"
        : locale === "ar"
          ? "فتح مساحة التلميذ"
          : "Ouvrir l’espace élève";

    return (
      <div className="rounded-3xl border border-white/10 bg-board-800/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300 ring-1 ring-emerald-300/30">
          ✓
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{text.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-chalk sm:text-3xl">{text.successTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-chalk-dim">{text.successBody}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-semibold text-chalk">{user.fullName}</p>
          <p className="mt-1 text-chalk-dim">{user.phone}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-accent-soft">{user.role}</p>
        </div>

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={destination}
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-board-900 transition-opacity hover:opacity-90"
          >
            {destinationLabel}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-chalk transition-colors hover:bg-white/10"
          >
            {text.backHome}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-chalk transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? text.loggingOut : text.logout}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-board-800/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{text.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-chalk sm:text-4xl">{text.title}</h1>
      <p className="mt-3 text-sm leading-7 text-chalk-dim">{text.description}</p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-chalk">
            {text.phoneLabel}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={text.phonePlaceholder}
            className="w-full rounded-2xl border border-white/15 bg-board-900/70 px-4 py-3 text-chalk outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-chalk">
            {text.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-board-900/70 px-4 py-3 text-chalk outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-5 py-3 font-bold text-board-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? text.submitting : text.submit}
        </button>
      </form>

      <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-chalk-dim">{text.adminNote}</p>
    </div>
  );
}
