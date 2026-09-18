"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type PersonStatus = "ACTIVE" | "DISABLED";

type Parent = {
  profileId: string;
  userId: string;
  fullName: string;
  phone: string;
  status: PersonStatus;
  preferredLanguage: "ar" | "fr";
};

type Teacher = Parent & {
  bio: string | null;
};

type Student = {
  profileId: string;
  userId: string;
  fullName: string;
  phone: string;
  status: PersonStatus;
  studentCode: string;
};

type LinkRow = {
  parentId: string;
  studentId: string;
  relationship: string | null;
};

type Snapshot = {
  parents: Parent[];
  teachers: Teacher[];
  students: Student[];
  links: LinkRow[];
};

const EMPTY: Snapshot = {
  parents: [],
  teachers: [],
  students: [],
  links: [],
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/70 focus:bg-white/8";
const buttonClass =
  "rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-board-900 transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50";

async function api(init?: RequestInit) {
  const response = await fetch("/api/v1/admin/people", {
    credentials: "include",
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

export function AdminPeopleClient({ locale }: { locale: "ar" | "fr" }) {
  const rtl = locale === "ar";
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api();
      setData(payload.data as Snapshot);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const studentById = useMemo(
    () => new Map(data.students.map((student) => [student.profileId, student])),
    [data.students],
  );

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await api({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMessage(rtl ? "تم حفظ التغيير بنجاح." : "Modification enregistrée.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function createPerson(
    event: FormEvent<HTMLFormElement>,
    role: "teacher" | "parent",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    await mutate({
      action: role === "teacher" ? "createTeacher" : "createParent",
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      password: fd.get("password"),
      preferredLanguage: fd.get("preferredLanguage"),
      ...(role === "teacher" ? { bio: fd.get("bio") } : {}),
    });
    form.reset();
  }

  async function linkStudent(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const studentId = String(fd.get("studentId") ?? "");
    if (!studentId) return;

    await mutate({
      action: "linkParentStudent",
      parentId,
      studentId,
      relationship: fd.get("relationship"),
    });
    form.reset();
  }

  const activeTeachers = data.teachers.filter((teacher) => teacher.status === "ACTIVE").length;
  const activeParents = data.parents.filter((parent) => parent.status === "ACTIVE").length;

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
                ACADEMY PEOPLE
              </span>
              <h1 className="mt-4 text-3xl font-black">
                {rtl ? "الأساتذة وأولياء الأمور" : "Professeurs & parents"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-chalk-dim">
                {rtl
                  ? "أنشئ حساب الأستاذ أو ولي الأمر واربط ولي الأمر بالتلميذ. تعيين الأستاذ للحصص يتم لاحقاً من التخطيط."
                  : "Créez les comptes prof/parent et reliez chaque parent à son enfant. L’affectation aux séances se fera ensuite dans le planning."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/admin`}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/5"
              >
                {rtl ? "لوحة Academy" : "Dashboard Academy"}
              </Link>
              <Link
                href={`/${locale}/admin/planning`}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/5"
              >
                {rtl ? "التخطيط" : "Planning"}
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric value={String(data.teachers.length)} label={rtl ? "الأساتذة" : "Professeurs"} />
          <Metric value={String(data.parents.length)} label={rtl ? "أولياء الأمور" : "Parents"} />
          <Metric value={String(data.students.length)} label={rtl ? "التلاميذ" : "Élèves"} />
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={rtl ? "إضافة أستاذ" : "Ajouter un professeur"}>
            <form className="space-y-3" onSubmit={(event) => void createPerson(event, "teacher")}>
              <Field label={rtl ? "الاسم الكامل" : "Nom complet"}>
                <input name="fullName" required className={inputClass} />
              </Field>
              <Field label={rtl ? "الهاتف" : "Téléphone"}>
                <input name="phone" required inputMode="tel" className={inputClass} placeholder="06XXXXXXXX" />
              </Field>
              <Field label={rtl ? "كلمة المرور المؤقتة" : "Mot de passe temporaire"}>
                <input name="password" required minLength={8} type="password" className={inputClass} />
              </Field>
              <Field label={rtl ? "اللغة" : "Langue"}>
                <select name="preferredLanguage" className={inputClass} defaultValue={locale}>
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                </select>
              </Field>
              <Field label={rtl ? "ملاحظة / تخصص" : "Note / spécialité"}>
                <textarea name="bio" rows={3} className={inputClass} />
              </Field>
              <button disabled={busy} className={buttonClass}>
                {rtl ? "إنشاء حساب الأستاذ" : "Créer le professeur"}
              </button>
            </form>
          </Card>

          <Card title={rtl ? "إضافة ولي أمر" : "Ajouter un parent"}>
            <form className="space-y-3" onSubmit={(event) => void createPerson(event, "parent")}>
              <Field label={rtl ? "الاسم الكامل" : "Nom complet"}>
                <input name="fullName" required className={inputClass} />
              </Field>
              <Field label={rtl ? "الهاتف" : "Téléphone"}>
                <input name="phone" required inputMode="tel" className={inputClass} placeholder="06XXXXXXXX" />
              </Field>
              <Field label={rtl ? "كلمة المرور المؤقتة" : "Mot de passe temporaire"}>
                <input name="password" required minLength={8} type="password" className={inputClass} />
              </Field>
              <Field label={rtl ? "اللغة" : "Langue"}>
                <select name="preferredLanguage" className={inputClass} defaultValue={locale}>
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                </select>
              </Field>
              <button disabled={busy} className={buttonClass}>
                {rtl ? "إنشاء حساب ولي الأمر" : "Créer le parent"}
              </button>
            </form>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <Card
            title={rtl ? `الأساتذة (${activeTeachers} نشط)` : `Professeurs (${activeTeachers} actifs)`}
          >
            {loading ? (
              <Loading rtl={rtl} />
            ) : data.teachers.length === 0 ? (
              <Empty text={rtl ? "لم يتم إنشاء أي أستاذ بعد." : "Aucun professeur créé."} />
            ) : (
              <div className="space-y-2">
                {data.teachers.map((teacher) => (
                  <PersonRow
                    key={teacher.profileId}
                    name={teacher.fullName}
                    phone={teacher.phone}
                    meta={teacher.bio || (rtl ? "بدون تخصص مسجل" : "Spécialité non renseignée")}
                    status={teacher.status}
                    rtl={rtl}
                    disabled={busy}
                    onToggle={() =>
                      void mutate({
                        action: "setUserStatus",
                        userId: teacher.userId,
                        status: teacher.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                      })
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card
            title={rtl ? `أولياء الأمور (${activeParents} نشط)` : `Parents (${activeParents} actifs)`}
          >
            {loading ? (
              <Loading rtl={rtl} />
            ) : data.parents.length === 0 ? (
              <Empty text={rtl ? "لم يتم إنشاء أي ولي أمر بعد." : "Aucun parent créé."} />
            ) : (
              <div className="space-y-4">
                {data.parents.map((parent) => {
                  const parentLinks = data.links.filter((link) => link.parentId === parent.profileId);
                  return (
                    <div
                      key={parent.profileId}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <PersonRow
                        name={parent.fullName}
                        phone={parent.phone}
                        meta={
                          rtl
                            ? `${parentLinks.length} تلميذ مرتبط`
                            : `${parentLinks.length} élève(s) lié(s)`
                        }
                        status={parent.status}
                        rtl={rtl}
                        disabled={busy}
                        onToggle={() =>
                          void mutate({
                            action: "setUserStatus",
                            userId: parent.userId,
                            status: parent.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                          })
                        }
                      />

                      {parentLinks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {parentLinks.map((link) => {
                            const student = studentById.get(link.studentId);
                            if (!student) return null;
                            return (
                              <span
                                key={link.studentId}
                                className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.07] px-3 py-1.5 text-xs font-bold text-accent-soft"
                              >
                                {student.fullName}
                                {link.relationship ? ` · ${link.relationship}` : ""}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate({
                                      action: "unlinkParentStudent",
                                      parentId: parent.profileId,
                                      studentId: link.studentId,
                                    })
                                  }
                                  className="text-white/45 hover:text-red-300"
                                  aria-label={rtl ? "إلغاء الربط" : "Délier"}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <form
                        className="mt-3 grid gap-2 sm:grid-cols-[1fr_0.7fr_auto]"
                        onSubmit={(event) => void linkStudent(event, parent.profileId)}
                      >
                        <select name="studentId" required className={inputClass} defaultValue="">
                          <option value="" disabled>
                            {rtl ? "اختر التلميذ" : "Choisir l’élève"}
                          </option>
                          {data.students.map((student) => (
                            <option key={student.profileId} value={student.profileId}>
                              {student.fullName} · {student.studentCode}
                            </option>
                          ))}
                        </select>
                        <input
                          name="relationship"
                          className={inputClass}
                          placeholder={rtl ? "الأب / الأم" : "Père / Mère"}
                        />
                        <button disabled={busy || data.students.length === 0} className={buttonClass}>
                          {rtl ? "ربط" : "Lier"}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-white/55">{label}</span>
      {children}
    </label>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/50">{label}</p>
    </div>
  );
}

function PersonRow({
  name,
  phone,
  meta,
  status,
  rtl,
  disabled,
  onToggle,
}: {
  name: string;
  phone: string;
  meta: string;
  status: PersonStatus;
  rtl: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-black">{name}</p>
        <p className="mt-1 text-xs text-white/45">{phone}</p>
        <p className="mt-1 text-xs text-white/35">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
            status === "ACTIVE"
              ? "bg-emerald-300/10 text-emerald-300"
              : "bg-red-300/10 text-red-300"
          }`}
        >
          {status === "ACTIVE"
            ? rtl
              ? "نشط"
              : "Actif"
            : rtl
              ? "موقوف"
              : "Désactivé"}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60 hover:bg-white/5 disabled:opacity-50"
        >
          {status === "ACTIVE"
            ? rtl
              ? "توقيف"
              : "Désactiver"
            : rtl
              ? "تفعيل"
              : "Activer"}
        </button>
      </div>
    </div>
  );
}

function Loading({ rtl }: { rtl: boolean }) {
  return (
    <p className="text-sm text-white/40">
      {rtl ? "جاري تحميل البيانات..." : "Chargement des données..."}
    </p>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-white/40">{text}</p>;
}
