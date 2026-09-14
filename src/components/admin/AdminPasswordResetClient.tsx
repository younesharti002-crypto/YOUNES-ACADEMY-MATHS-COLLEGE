"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Locale = "ar" | "fr";
type UserRow = {
  id: string;
  fullName: string;
  phone: string;
  role: "STUDENT" | "PARENT" | "TEACHER";
  status: "ACTIVE" | "DISABLED";
};

export function AdminPasswordResetClient({ locale }: { locale: Locale }) {
  const isAr = locale === "ar";
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const response = await fetch("/api/v1/admin/users/password", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const payload = (await response.json()) as {
          data?: { users?: UserRow[] };
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(payload.error?.message || "Unable to load users.");
        }

        if (active) setUsers(payload.data?.users ?? []);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load users.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === userId) ?? null,
    [userId, users],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!userId) {
      setError(isAr ? "اختر المستخدم أولاً." : "Sélectionnez d’abord un utilisateur.");
      return;
    }

    if (newPassword.length < 8) {
      setError(isAr ? "كلمة السر خاصها تكون 8 أحرف على الأقل." : "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isAr ? "تأكيد كلمة السر غير مطابق." : "La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/users/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      const payload = (await response.json()) as {
        data?: { user?: { fullName?: string } };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message || "Password reset failed.");
      }

      setNewPassword("");
      setConfirmPassword("");
      setMessage(
        isAr
          ? `تم تغيير كلمة سر ${payload.data?.user?.fullName ?? "المستخدم"} وإغلاق جميع جلساته القديمة.`
          : `Mot de passe de ${payload.data?.user?.fullName ?? "l’utilisateur"} modifié. Toutes les anciennes sessions ont été fermées.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">ADMIN SECURITY</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {isAr ? "إعادة تعيين كلمة السر" : "Réinitialiser un mot de passe"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-chalk-dim">
            {isAr
              ? "الإدارة فقط تقدر تغيّر كلمة سر الأستاذ أو التلميذ. بعد التغيير، جميع الجلسات القديمة ديال الحساب كتتسد تلقائياً."
              : "Seul un administrateur peut modifier le mot de passe d’un professeur ou d’un élève. Toutes les anciennes sessions sont automatiquement révoquées."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-board-800/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <label className="block text-sm font-semibold text-chalk" htmlFor="reset-user">
            {isAr ? "الحساب" : "Compte"}
          </label>
          <select
            id="reset-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={loading}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-board-900/80 px-4 py-3 text-chalk outline-none focus:border-accent/70"
          >
            <option value="">{loading ? (isAr ? "جاري التحميل..." : "Chargement...") : (isAr ? "اختر الحساب" : "Sélectionner un compte")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} — {user.role} — {user.phone}
              </option>
            ))}
          </select>

          {selectedUser ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <p className="font-semibold text-chalk">{selectedUser.fullName}</p>
              <p className="mt-1 text-chalk-dim">{selectedUser.phone}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">
                {selectedUser.role} · {selectedUser.status}
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-chalk">
                {isAr ? "كلمة السر الجديدة" : "Nouveau mot de passe"}
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-board-900/80 px-4 py-3 text-chalk outline-none focus:border-accent/70"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-chalk">
                {isAr ? "تأكيد كلمة السر" : "Confirmer le mot de passe"}
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-board-900/80 px-4 py-3 text-chalk outline-none focus:border-accent/70"
              />
            </div>
          </div>

          {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          {message ? <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}

          <button
            type="submit"
            disabled={submitting || loading}
            className="mt-6 w-full rounded-full bg-accent px-5 py-3 font-bold text-board-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? isAr ? "جاري التغيير..." : "Modification..."
              : isAr ? "تغيير كلمة السر" : "Réinitialiser le mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}
