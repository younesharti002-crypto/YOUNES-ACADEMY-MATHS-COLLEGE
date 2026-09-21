"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Subject = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type AcademicPayload = {
  data?: {
    subjects?: Subject[];
  };
  error?: {
    message?: string;
  };
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/70 focus:bg-white/[0.07]";

function makeSlug(value: string) {
  const cleaned = value.trim().toLowerCase();
  const known: Record<string, string> = {
    "math": "maths",
    "maths": "maths",
    "mathematiques": "mathematiques",
    "mathématiques": "mathematiques",
    "رياضيات": "maths",
    "الرياضيات": "maths",
    "pc": "pc",
    "physique": "physique-chimie",
    "physique chimie": "physique-chimie",
    "physique-chimie": "physique-chimie",
    "فيزياء": "physique-chimie",
    "الفيزياء": "physique-chimie",
    "svt": "svt",
    "علوم الحياة والأرض": "svt",
    "francais": "francais",
    "français": "francais",
    "فرنسية": "francais",
    "الفرنسية": "francais",
    "arabe": "arabe",
    "العربية": "arabe",
    "anglais": "anglais",
    "english": "anglais",
    "الإنجليزية": "anglais",
    "hg": "hg",
    "histoire geo": "histoire-geographie",
    "histoire géo": "histoire-geographie",
    "histoire geographie": "histoire-geographie",
    "الاجتماعيات": "hg",
    "comptabilite": "comptabilite",
    "comptabilité": "comptabilite",
    "محاسبة": "comptabilite",
    "economie": "economie-generale",
    "économie": "economie-generale",
    "economie generale": "economie-generale",
    "économie générale": "economie-generale",
    "اقتصاد": "economie-generale",
    "philosophie": "philosophie",
    "الفلسفة": "philosophie",
  };

  if (known[cleaned]) return known[cleaned];

  const slug = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `subject-${Date.now()}`;
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as AcademicPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || "Operation failed");
  }
  return payload;
}

export function AdminSubjectsClient({ locale }: { locale: "ar" | "fr" }) {
  const ar = locale === "ar";
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const slug = useMemo(() => makeSlug(name), [name]);

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((subject) =>
      `${subject.name} ${subject.slug}`.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await api("/api/v1/admin/academic");
      setSubjects(payload.data?.subjects || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/admin/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          entity: "subject",
          name: cleanName,
          slug,
          active: true,
        }),
      });
      setName("");
      setMessage(ar ? "تمت إضافة المادة بنجاح." : "Matière ajoutée avec succès.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateSubject(subject: Subject, patch: Partial<Subject>) {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/admin/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          entity: "subject",
          id: subject.id,
          name: patch.name ?? subject.name,
          slug: patch.slug ?? subject.slug,
          active: patch.active ?? subject.active,
        }),
      });
      setMessage(ar ? "تم تحديث المادة." : "Matière mise à jour.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function renameSubject(subject: Subject) {
    const next = window.prompt(ar ? "اسم المادة الجديد" : "Nouveau nom", subject.name)?.trim();
    if (!next || next === subject.name) return;
    await updateSubject(subject, { name: next, slug: makeSlug(next) });
  }

  async function deleteSubject(subject: Subject) {
    if (!window.confirm(ar ? "تأكيد حذف هذه المادة؟" : "Confirmer la suppression ?")) return;
    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/admin/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", entity: "subject", id: subject.id }),
      });
      setMessage(ar ? "تم حذف المادة." : "Matière supprimée.");
      await refresh();
    } catch (error) {
      setMessage(
        ar
          ? "لا يمكن حذف مادة مرتبطة بمستويات أو دروس. يمكن توقيفها بدل الحذف."
          : error instanceof Error
            ? error.message
            : "Delete failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                THE SECRET ACADEMY ADMIN
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                {ar ? "إدارة المواد" : "Gestion des matières"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-chalk-dim">
                {ar
                  ? "من هنا تقدر تزيد المواد، توقفها أو تعدلها. بعد إضافة المادة، نربطها بالمستويات من صفحة الإدارة الأكاديمية."
                  : "Ajoutez, activez ou désactivez les matières. L’association aux niveaux se fait ensuite dans la gestion académique."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${locale}/admin`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/5">
                {ar ? "فضاء الإدارة" : "Admin"}
              </Link>
              <Link href={`/${locale}/admin/academic`} className="rounded-full bg-accent px-4 py-2 text-sm font-black text-board-900 hover:bg-accent-soft">
                {ar ? "ربط بالمستويات" : "Lier aux niveaux"}
              </Link>
            </div>
          </div>
        </header>

        {message ? (
          <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-bold text-accent-soft">
            {message}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={saveSubject} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-xl font-black">{ar ? "إضافة مادة جديدة" : "Ajouter une matière"}</h2>
            <p className="mt-2 text-sm leading-6 text-chalk-dim">
              {ar ? "كتب غير اسم المادة، والنظام يولد الكود تلقائياً." : "Entrez seulement le nom; le slug sera généré automatiquement."}
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-white/45">
                  {ar ? "اسم المادة" : "Nom de la matière"}
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder={ar ? "مثال: الفلسفة" : "Exemple : Philosophie"}
                  className={inputClass}
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent/80">Slug</p>
                <p className="mt-1 break-all text-sm font-bold text-white/75">{slug}</p>
              </div>
              <button disabled={busy || !name.trim()} className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-black text-board-900 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? (ar ? "جاري الحفظ..." : "Enregistrement...") : ar ? "إضافة المادة" : "Ajouter"}
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">{ar ? "المواد الموجودة" : "Matières existantes"}</h2>
                <p className="mt-1 text-xs font-bold text-white/45">
                  {subjects.length} {ar ? "مادة" : "matières"}
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={ar ? "بحث..." : "Recherche..."}
                className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/70"
              />
            </div>

            <div className="mt-5 space-y-2.5">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-chalk-dim">
                  {ar ? "جاري تحميل المواد..." : "Chargement..."}
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-chalk-dim">
                  {ar ? "ما كايناش مواد مطابقة." : "Aucune matière trouvée."}
                </div>
              ) : (
                filteredSubjects.map((subject) => (
                  <article key={subject.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-black text-white">{subject.name}</h3>
                        <p className="mt-1 text-xs font-bold text-white/45">{subject.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void updateSubject(subject, { active: !subject.active })}
                          disabled={busy}
                          className={`rounded-full px-3 py-1.5 text-xs font-black ${subject.active ? "bg-emerald-300/15 text-emerald-200" : "bg-red-300/15 text-red-200"}`}
                        >
                          {subject.active ? (ar ? "مفعلة" : "Active") : ar ? "موقوفة" : "Inactive"}
                        </button>
                        <button type="button" onClick={() => void renameSubject(subject)} disabled={busy} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:border-accent/40 hover:text-accent">
                          {ar ? "تعديل" : "Modifier"}
                        </button>
                        <button type="button" onClick={() => void deleteSubject(subject)} disabled={busy} className="rounded-full border border-red-300/25 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-300/10">
                          {ar ? "حذف" : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
