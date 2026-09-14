"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AcademicYear = { id: string; name: string; startsAt: string; endsAt: string; active: boolean };
type Level = { id: string; name: string };
type Stream = { id: string; name: string; levelId: string };
type Group = { id: string; name: string; academicYearId: string; levelId: string; streamId: string | null; active: boolean };
type Subject = { id: string; name: string; slug: string; active: boolean };
type Student = { id: string; userId: string; fullName: string; phone: string; status: "ACTIVE" | "DISABLED"; studentCode: string; levelId: string; streamId: string | null; primaryGroupId: string | null };

type Snapshot = {
  academicYears: AcademicYear[];
  levels: Level[];
  streams: Stream[];
  groups: Group[];
  subjects: Subject[];
  students: Student[];
};

const EMPTY: Snapshot = { academicYears: [], levels: [], streams: [], groups: [], subjects: [], students: [] };

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/55">{children}</label>;
}

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/70 focus:bg-white/8";
const buttonClass = "rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-board-900 transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50";

export function AcademicAdminClient({ lang }: { lang: "ar" | "fr" }) {
  const rtl = lang === "ar";
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("/api/v1/admin/academic");
      setData(payload.data as Snapshot);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const names = useMemo(() => ({
    level: new Map(data.levels.map((row) => [row.id, row.name])),
    stream: new Map(data.streams.map((row) => [row.id, row.name])),
    year: new Map(data.academicYears.map((row) => [row.id, row.name])),
    group: new Map(data.groups.map((row) => [row.id, row.name])),
  }), [data]);

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/v1/admin/academic", {
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

  async function rename(entity: string, row: Record<string, unknown>) {
    const current = String(row.name ?? "");
    const next = window.prompt(rtl ? "الاسم الجديد" : "Nouveau nom", current)?.trim();
    if (!next || next === current) return;
    await mutate({ action: "update", entity, ...row, name: next });
  }

  async function remove(entity: string, id: string) {
    if (!window.confirm(rtl ? "تأكيد الحذف؟" : "Confirmer la suppression ?")) return;
    await mutate({ action: "delete", entity, id });
  }

  async function submitYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await mutate({ action: "create", entity: "academicYear", name: fd.get("name"), startsAt: fd.get("startsAt"), endsAt: fd.get("endsAt"), active: true });
    event.currentTarget.reset();
  }

  async function submitSimple(event: FormEvent<HTMLFormElement>, entity: "level" | "subject") {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await mutate({ action: "create", entity, name: fd.get("name"), ...(entity === "subject" ? { slug: fd.get("slug"), active: true } : {}) });
    event.currentTarget.reset();
  }

  async function submitStream(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await mutate({ action: "create", entity: "stream", name: fd.get("name"), levelId: fd.get("levelId") });
    event.currentTarget.reset();
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await mutate({ action: "create", entity: "group", name: fd.get("name"), academicYearId: fd.get("academicYearId"), levelId: fd.get("levelId"), streamId: fd.get("streamId") || null, active: true });
    event.currentTarget.reset();
  }

  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const groupId = String(fd.get("groupId") ?? "");
    const group = data.groups.find((row) => row.id === groupId);
    await mutate({
      action: "create",
      entity: "student",
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      password: fd.get("password"),
      studentCode: fd.get("studentCode"),
      levelId: fd.get("levelId"),
      groupId: group?.id ?? null,
    });
    form.reset();
  }

  async function assignGroup(studentProfileId: string, groupId: string) {
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/v1/admin/students/${studentProfileId}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId || null }),
      });
      setMessage(rtl ? "تم تعيين المجموعة." : "Groupe assigné.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-board-900 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-accent">YOUNES · ADMIN</p>
            <h1 className="text-3xl font-black sm:text-4xl">{rtl ? "الإدارة الأكاديمية" : "Administration académique"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{rtl ? "إدارة السنة الدراسية، المستويات، الشعب، المجموعات والمواد من نفس المكان." : "Gérez les années, niveaux, filières, groupes et matières depuis un seul espace."}</p>
          </div>
          <button onClick={() => void refresh()} disabled={loading || busy} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5">{rtl ? "تحديث البيانات" : "Actualiser"}</button>
        </div>

        {message && <div className="mb-6 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-accent-soft">{message}</div>}
        {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">{rtl ? "جاري تحميل البيانات…" : "Chargement…"}</div> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={rtl ? "السنة الدراسية" : "Années scolaires"}>
              <form onSubmit={submitYear} className="grid gap-3 sm:grid-cols-3">
                <div><Label>{rtl ? "الاسم" : "Nom"}</Label><input required name="name" placeholder="2026/2027" className={inputClass} /></div>
                <div><Label>{rtl ? "البداية" : "Début"}</Label><input required type="date" name="startsAt" className={inputClass} /></div>
                <div><Label>{rtl ? "النهاية" : "Fin"}</Label><input required type="date" name="endsAt" className={inputClass} /></div>
                <button disabled={busy} className={`${buttonClass} sm:col-span-3`}>{rtl ? "إضافة السنة" : "Ajouter l’année"}</button>
              </form>
              <Rows rows={data.academicYears} render={(row) => <Row key={row.id} title={row.name} meta={`${new Date(row.startsAt).toLocaleDateString()} → ${new Date(row.endsAt).toLocaleDateString()}`} onEdit={() => void rename("academicYear", row as unknown as Record<string, unknown>)} onDelete={() => void remove("academicYear", row.id)} rtl={rtl} />} />
            </Section>

            <Section title={rtl ? "المستويات" : "Niveaux"}>
              <form onSubmit={(e) => void submitSimple(e, "level")} className="flex gap-3"><input required name="name" placeholder="2BAC" className={inputClass} /><button disabled={busy} className={buttonClass}>{rtl ? "إضافة" : "Ajouter"}</button></form>
              <Rows rows={data.levels} render={(row) => <Row key={row.id} title={row.name} onEdit={() => void rename("level", row as unknown as Record<string, unknown>)} onDelete={() => void remove("level", row.id)} rtl={rtl} />} />
            </Section>

            <Section title={rtl ? "الشعب" : "Filières"}>
              <form onSubmit={submitStream} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input required name="name" placeholder="PC / SM" className={inputClass} /><select required name="levelId" className={inputClass}><option value="">{rtl ? "اختر المستوى" : "Choisir niveau"}</option>{data.levels.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><button disabled={busy} className={buttonClass}>{rtl ? "إضافة" : "Ajouter"}</button></form>
              <Rows rows={data.streams} render={(row) => <Row key={row.id} title={row.name} meta={names.level.get(row.levelId)} onEdit={() => void rename("stream", row as unknown as Record<string, unknown>)} onDelete={() => void remove("stream", row.id)} rtl={rtl} />} />
            </Section>

            <Section title={rtl ? "المواد" : "Matières"}>
              <form onSubmit={(e) => void submitSimple(e, "subject")} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input required name="name" placeholder="Mathématiques" className={inputClass} /><input required name="slug" placeholder="mathematiques" pattern="[a-z0-9-]+" className={inputClass} /><button disabled={busy} className={buttonClass}>{rtl ? "إضافة" : "Ajouter"}</button></form>
              <Rows rows={data.subjects} render={(row) => <Row key={row.id} title={row.name} meta={row.slug} onEdit={() => void rename("subject", row as unknown as Record<string, unknown>)} onDelete={() => void remove("subject", row.id)} rtl={rtl} />} />
            </Section>

            <Section title={rtl ? "المجموعات" : "Groupes"} wide>
              <form onSubmit={submitGroup} className="grid gap-3 md:grid-cols-4"><input required name="name" placeholder="2BAC-PC-A" className={inputClass} /><select required name="academicYearId" className={inputClass}><option value="">{rtl ? "السنة" : "Année"}</option>{data.academicYears.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><select required name="levelId" className={inputClass}><option value="">{rtl ? "المستوى" : "Niveau"}</option>{data.levels.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><select name="streamId" className={inputClass}><option value="">{rtl ? "بدون شعبة" : "Sans filière"}</option>{data.streams.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><button disabled={busy} className={`${buttonClass} md:col-span-4`}>{rtl ? "إنشاء المجموعة" : "Créer le groupe"}</button></form>
              <Rows rows={data.groups} render={(row) => <Row key={row.id} title={row.name} meta={[names.year.get(row.academicYearId), names.level.get(row.levelId), row.streamId ? names.stream.get(row.streamId) : null].filter(Boolean).join(" · ")} onEdit={() => void rename("group", row as unknown as Record<string, unknown>)} onDelete={() => void remove("group", row.id)} rtl={rtl} />} />
            </Section>

            <Section title={rtl ? "إضافة تلميذ جديد" : "Ajouter un élève"} wide>
              <form onSubmit={submitStudent} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div><Label>{rtl ? "الاسم الكامل" : "Nom complet"}</Label><input required name="fullName" placeholder={rtl ? "اسم التلميذ" : "Nom de l’élève"} className={inputClass} /></div>
                <div><Label>{rtl ? "رقم واتساب" : "Téléphone WhatsApp"}</Label><input required name="phone" inputMode="tel" placeholder="06XXXXXXXX" className={inputClass} /></div>
                <div><Label>{rtl ? "كلمة السر الأولية" : "Mot de passe initial"}</Label><input required name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" className={inputClass} /></div>
                <div><Label>{rtl ? "رمز التلميذ" : "Code élève"}</Label><input required name="studentCode" placeholder="YA-1AC-001" className={inputClass} /></div>
                <div><Label>{rtl ? "المستوى" : "Niveau"}</Label><select required name="levelId" className={inputClass}><option value="">{rtl ? "اختر المستوى" : "Choisir le niveau"}</option>{data.levels.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
                <div><Label>{rtl ? "المجموعة (اختياري)" : "Groupe (optionnel)"}</Label><select name="groupId" className={inputClass}><option value="">{rtl ? "بدون مجموعة" : "Sans groupe"}</option>{data.groups.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
                <button disabled={busy} className={`${buttonClass} md:col-span-2 lg:col-span-3`}>{rtl ? "إنشاء الحساب وتفعيل الاشتراك" : "Créer le compte et activer l’abonnement"}</button>
              </form>
            </Section>

            <Section title={rtl ? "تعيين الطلاب للمجموعات" : "Affectation des élèves"} wide>
              {data.students.length === 0 ? <p className="text-sm text-white/50">{rtl ? "لا توجد Student Profiles بعد. تظهر هنا تلقائياً عند إنشائها." : "Aucun profil élève pour le moment. Ils apparaîtront ici automatiquement."}</p> : (
                <div className="space-y-3">{data.students.map((student) => (
                  <div key={student.id} className="grid items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 md:grid-cols-[1.3fr_.7fr_1fr]">
                    <div><p className="font-bold">{student.fullName}</p><p className="text-xs text-white/45">{student.phone} · {student.studentCode} · {names.level.get(student.levelId)}{student.streamId ? ` · ${names.stream.get(student.streamId)}` : ""}</p></div>
                    <span className="text-sm text-white/60">{student.primaryGroupId ? names.group.get(student.primaryGroupId) : (rtl ? "بدون مجموعة" : "Sans groupe")}</span>
                    <select disabled={busy} value={student.primaryGroupId ?? ""} onChange={(e) => void assignGroup(student.id, e.target.value)} className={inputClass}><option value="">{rtl ? "إلغاء التعيين" : "Retirer l’affectation"}</option>{data.groups.filter((g) => g.active && g.levelId === student.levelId && (g.streamId === null || g.streamId === student.streamId)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                  </div>
                ))}</div>
              )}
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/10 ${wide ? "lg:col-span-2" : ""}`}><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function Rows<T>({ rows, render }: { rows: T[]; render: (row: T) => React.ReactNode }) {
  return <div className="mt-4 space-y-2">{rows.map(render)}</div>;
}

function Row({ title, meta, onEdit, onDelete, rtl }: { title: string; meta?: string; onEdit: () => void; onDelete: () => void; rtl: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-bold">{title}</p>{meta && <p className="truncate text-xs text-white/45">{meta}</p>}</div><div className="flex gap-2"><button type="button" onClick={onEdit} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/65 hover:bg-white/5">{rtl ? "تعديل" : "Modifier"}</button><button type="button" onClick={onDelete} className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10">{rtl ? "حذف" : "Supprimer"}</button></div></div>;
}
