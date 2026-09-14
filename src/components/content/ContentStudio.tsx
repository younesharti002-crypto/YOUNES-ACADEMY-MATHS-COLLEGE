"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = { id: string; name?: string; title?: string; status?: string; courseId?: string; chapterId?: string; subjectId?: string; academicYearId?: string; levelId?: string; streamId?: string | null; description?: string | null; slug?: string; summary?: string | null; videoUrl?: string | null; pdfUrl?: string | null; position?: number };
type Data = { academicYears: Row[]; levels: Row[]; streams: Row[]; subjects: Row[]; courses: Row[]; chapters: Row[]; lessons: Row[] };

const emptyData: Data = { academicYears: [], levels: [], streams: [], subjects: [], courses: [], chapters: [], lessons: [] };
const panel = "rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-[0_18px_45px_rgba(0,0,0,0.16)]";

export function ContentStudio({ lang }: { lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/v1/admin/content", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) {
      setData(json.data as Data);
      setSelectedCourseId((current) => current || json.data.courses?.[0]?.id || "");
    } else setMessage(json.error?.message || "Unable to load content.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedCourse = data.courses.find((course) => course.id === selectedCourseId);
  const courseChapters = useMemo(() => data.chapters.filter((chapter) => chapter.courseId === selectedCourseId), [data.chapters, selectedCourseId]);
  const visibleChapterId = selectedChapterId || courseChapters[0]?.id || "";
  const chapterLessons = data.lessons.filter((lesson) => lesson.chapterId === visibleChapterId);

  async function mutate(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(json.error?.message || "Operation failed."); return false; }
    setMessage(successMessage);
    await load();
    return true;
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "course.create", title: form.get("title"), slug: form.get("slug"), description: form.get("description"), subjectId: form.get("subjectId"), academicYearId: form.get("academicYearId"), levelId: form.get("levelId"), streamId: form.get("streamId") }, ar ? "تم إنشاء الكورس." : "Cours créé.");
    if (ok) event.currentTarget.reset();
  }

  async function createChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "chapter.create", courseId: selectedCourseId, title: form.get("title"), position: form.get("position") }, ar ? "تمت إضافة الفصل." : "Chapitre ajouté.");
    if (ok) event.currentTarget.reset();
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await mutate({ operation: "lesson.create", chapterId: visibleChapterId, title: form.get("title"), summary: form.get("summary"), videoUrl: form.get("videoUrl"), pdfUrl: form.get("pdfUrl"), position: form.get("position") }, ar ? "تمت إضافة الدرس." : "Leçon ajoutée.");
    if (ok) event.currentTarget.reset();
  }

  async function setStatus(entity: "course" | "chapter" | "lesson", id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    await mutate({ operation: "status.set", entity, id, status }, ar ? "تم تحديث حالة المحتوى." : "Statut mis à jour.");
  }

  if (loading) return <main className="min-h-screen bg-board-900 px-6 py-12 text-chalk">{ar ? "جاري تحميل الاستوديو..." : "Chargement du studio..."}</main>;

  return (
    <main className="min-h-screen bg-board-900 text-chalk" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-white/10 bg-[#06111d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/studio`} className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-black text-accent">YA</span>
            <span><span className="block text-sm font-black tracking-wide">YOUNES</span><span className="block text-[9px] uppercase tracking-[0.28em] text-accent">Teacher Studio</span></span>
          </Link>
          <nav className="ms-auto flex flex-wrap gap-2 text-xs font-bold">
            <Link href={`/${lang}/studio`} className="rounded-full bg-accent px-4 py-2 text-board-900">{ar ? "المحتوى" : "Contenu"}</Link>
            <Link href={`/${lang}/studio/live`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">Live</Link>
            <Link href={`/${lang}/studio/assessments`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">Quiz</Link>
            <Link href={`/${lang}/dashboard`} className="rounded-full border border-white/15 px-4 py-2 text-chalk-dim hover:border-accent/40 hover:text-accent">{ar ? "معاينة الطالب" : "Vue élève"}</Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">CONTENT STUDIO</span>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? "إدارة المحتوى" : "Gestion du contenu"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-chalk-dim">{ar ? "الكورس، الفصل والدرس فمسار واحد واضح. المحتوى ما كيبانش للتلميذ حتى تنشرو." : "Cours, chapitres et leçons dans un seul flux. Rien n’apparaît aux élèves avant publication."}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric value={data.courses.length} label={ar ? "كورسات" : "Cours"} />
            <Metric value={data.chapters.length} label={ar ? "فصول" : "Chapitres"} />
            <Metric value={data.lessons.length} label={ar ? "دروس" : "Leçons"} />
          </div>
        </header>

        {message ? <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{message}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <form onSubmit={createCourse} className={`${panel} p-6`}>
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.18em] text-accent">01 · COURSE</p><h2 className="mt-2 text-xl font-black">{ar ? "إنشاء كورس" : "Créer un cours"}</h2></div><span className="grid size-11 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-xl text-accent">＋</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field name="title" placeholder={ar ? "مثال: الرياضيات 1AC" : "Ex: Mathématiques 1AC"} required />
              <Field name="slug" placeholder="physique-2bac" required ltr />
              <Select name="subjectId" label={ar ? "المادة" : "Matière"} rows={data.subjects} required />
              <Select name="academicYearId" label={ar ? "السنة الدراسية" : "Année"} rows={data.academicYears} required />
              <Select name="levelId" label={ar ? "المستوى" : "Niveau"} rows={data.levels} required />
              <Select name="streamId" label={ar ? "الشعبة (اختياري)" : "Filière (optionnel)"} rows={data.streams} />
            </div>
            <textarea name="description" placeholder={ar ? "وصف مختصر للكورس" : "Description du cours"} className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
            <button disabled={busy} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900 shadow-[0_10px_25px_rgba(209,166,54,0.18)] disabled:opacity-50">{ar ? "إنشاء الكورس" : "Créer le cours"}</button>
          </form>

          <div className={`${panel} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black tracking-[0.18em] text-accent">CONTENT TREE</p><h2 className="mt-2 text-xl font-black">{ar ? "المحتوى الحالي" : "Contenu actuel"}</h2></div>
              <select value={selectedCourseId} onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedChapterId(""); }} className="rounded-full border border-white/10 bg-[#081827] px-4 py-2 text-sm text-chalk outline-none focus:border-accent/50"><option value="">{ar ? "اختر كورس" : "Choisir un cours"}</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            </div>

            {selectedCourse ? (
              <div className="mt-5 rounded-3xl border border-accent/15 bg-gradient-to-br from-accent/[0.08] to-white/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold text-accent">{ar ? "الكورس النشط" : "Cours actif"}</p><h3 className="mt-1 text-lg font-black">{selectedCourse.title}</h3><p className="mt-1 text-xs text-chalk-dim">/{selectedCourse.slug}</p></div><StatusBadge status={selectedCourse.status || "DRAFT"} /></div>
                <div className="mt-4"><StatusButtons busy={busy} onSet={(next) => setStatus("course", selectedCourse.id, next)} lang={lang} /></div>
              </div>
            ) : <p className="mt-6 text-sm text-chalk-dim">{ar ? "أنشئ أول كورس للبدء." : "Créez votre premier cours."}</p>}
          </div>
        </section>

        {selectedCourse ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className={`${panel} p-6`}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.18em] text-accent">02 · CHAPTER</p><h2 className="mt-2 text-xl font-black">{ar ? "الفصول" : "Chapitres"}</h2></div><span className="text-xs font-bold text-chalk-dim">{courseChapters.length}</span></div>
              <form onSubmit={createChapter} className="mt-4 flex gap-2"><Field name="title" placeholder={ar ? "عنوان الفصل" : "Titre du chapitre"} required grow /><input name="position" type="number" min="0" defaultValue="0" className="w-20 rounded-2xl border border-white/10 bg-[#081827] px-3 text-sm text-chalk outline-none" /><button disabled={busy} className="rounded-2xl bg-accent px-4 text-sm font-black text-board-900">+</button></form>
              <div className="mt-5 space-y-2">
                {courseChapters.map((chapter, index) => (
                  <button key={chapter.id} onClick={() => setSelectedChapterId(chapter.id)} className={`w-full rounded-2xl border p-4 text-start transition ${visibleChapterId === chapter.id ? "border-accent/40 bg-accent/10" : "border-white/10 bg-[#081827]/60 hover:border-white/20"}`}>
                    <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-white/[0.05] text-[10px] font-black text-accent">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 font-bold">{chapter.title}</span><StatusBadge status={chapter.status || "DRAFT"} /></div>
                  </button>
                ))}
              </div>
              {visibleChapterId ? <div className="mt-4"><StatusButtons busy={busy} onSet={(next) => setStatus("chapter", visibleChapterId, next)} lang={lang} /></div> : null}
            </div>

            <div className={`${panel} p-6`}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[0.18em] text-accent">03 · LESSON</p><h2 className="mt-2 text-xl font-black">{ar ? "الدروس" : "Leçons"}</h2></div><span className="text-xs font-bold text-chalk-dim">{chapterLessons.length}</span></div>
              {visibleChapterId ? (
                <>
                  <form onSubmit={createLesson} className="mt-4 space-y-3">
                    <Field name="title" placeholder={ar ? "عنوان الدرس" : "Titre de la leçon"} required />
                    <textarea name="summary" placeholder={ar ? "ملخص قصير" : "Résumé"} className="min-h-20 w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60" />
                    <div className="grid gap-3 sm:grid-cols-2"><Field name="videoUrl" placeholder="https://... video" ltr /><Field name="pdfUrl" placeholder="https://... PDF" ltr /></div>
                    <div className="flex gap-2"><input name="position" type="number" min="0" defaultValue="0" className="w-24 rounded-2xl border border-white/10 bg-[#081827] px-3 text-sm text-chalk" /><button disabled={busy} className="rounded-full bg-accent px-5 py-2.5 text-sm font-black text-board-900">{ar ? "إضافة الدرس" : "Ajouter"}</button></div>
                  </form>
                  <div className="mt-6 space-y-3">
                    {chapterLessons.map((lesson, index) => (
                      <article key={lesson.id} className="rounded-2xl border border-white/10 bg-[#081827]/65 p-4">
                        <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-[10px] font-black text-accent">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><h3 className="font-bold">{lesson.title}</h3><p className="mt-1 text-xs text-chalk-dim">{lesson.videoUrl ? "Video" : ""}{lesson.videoUrl && lesson.pdfUrl ? " · " : ""}{lesson.pdfUrl ? "PDF" : ""}</p></div><StatusBadge status={lesson.status || "DRAFT"} /></div>
                        <div className="mt-3"><StatusButtons busy={busy} onSet={(next) => setStatus("lesson", lesson.id, next)} lang={lang} /></div>
                      </article>
                    ))}
                  </div>
                </>
              ) : <p className="mt-5 text-sm text-chalk-dim">{ar ? "أضف فصلاً أولاً." : "Ajoutez d’abord un chapitre."}</p>}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="min-w-[78px] rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center"><p className="text-xl font-black text-accent">{value}</p><p className="mt-1 text-[9px] font-bold text-chalk-dim">{label}</p></div>;
}

function Field({ name, placeholder, required, ltr, grow }: { name: string; placeholder: string; required?: boolean; ltr?: boolean; grow?: boolean }) {
  return <input name={name} placeholder={placeholder} required={required} dir={ltr ? "ltr" : undefined} className={`${grow ? "min-w-0 flex-1" : "w-full"} rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none placeholder:text-chalk-dim/55 focus:border-accent/60`} />;
}

function Select({ name, label, rows, required }: { name: string; label: string; rows: Row[]; required?: boolean }) {
  return <select name={name} required={required} className="w-full rounded-2xl border border-white/10 bg-[#081827] px-4 py-3 text-sm text-chalk outline-none focus:border-accent/60"><option value="">{label}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name || row.title}</option>)}</select>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "PUBLISHED" ? "bg-emerald-400/10 text-emerald-300 border-emerald-300/20" : status === "ARCHIVED" ? "bg-white/[0.04] text-chalk-dim border-white/10" : "bg-accent/10 text-accent border-accent/20";
  return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${tone}`}>{status}</span>;
}

function StatusButtons({ busy, onSet, lang }: { busy: boolean; onSet: (status: "DRAFT" | "PUBLISHED" | "ARCHIVED") => void; lang: "ar" | "fr" }) {
  const ar = lang === "ar";
  return <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => onSet("DRAFT")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-chalk-dim hover:border-accent/30 hover:text-accent">Draft</button><button type="button" disabled={busy} onClick={() => onSet("PUBLISHED")} className="rounded-full bg-accent px-3 py-1.5 text-xs font-black text-board-900">{ar ? "نشر" : "Publier"}</button><button type="button" disabled={busy} onClick={() => onSet("ARCHIVED")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-chalk-dim hover:border-white/20">Archive</button></div>;
}
