import Link from "next/link";
import type { StudentSubjectCard } from "@/lib/student/student-subjects";

export function StudentSubjectsPanel({
  locale,
  subjects,
}: {
  locale: "ar" | "fr";
  subjects: StudentSubjectCard[];
}) {
  const ar = locale === "ar";

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-40 rounded-[1.6rem] border border-accent/25 bg-board-900/95 p-4 text-chalk shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:inset-x-auto sm:start-5 sm:w-[380px]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
            {ar ? "فضاء التلميذ" : "Espace élève"}
          </p>
          <h2 className="mt-1 text-xl font-black">
            {ar ? "موادي" : "Mes matières"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-chalk-dim">
            {ar
              ? "المواد المرتبطة بالمستوى والشعبة ديالك."
              : "Les matières liées à votre niveau et votre filière."}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-sm font-black text-board-900">
          {subjects.length}
        </span>
      </div>

      <div className="mt-4 max-h-[16rem] space-y-2 overflow-y-auto pe-1">
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-chalk-dim">
            {ar
              ? "مازال ما تعيناتش المواد لهذا الحساب. الإدارة خاصها تكمل ربط المستوى والشعبة."
              : "Aucune matière n’est encore associée à ce compte. L’administration doit finaliser le niveau et la filière."}
          </div>
        ) : (
          subjects.map((subject) => (
            <article
              key={`${subject.levelName}-${subject.streamName || "core"}-${subject.subjectName}`}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-sm font-black text-accent">
                  {subject.subjectName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-chalk">{subject.subjectName}</h3>
                  <p className="mt-0.5 text-[11px] font-bold text-chalk-dim">
                    {subject.levelName}{subject.streamName ? ` · ${subject.streamName}` : ""}
                    {" · "}
                    {subject.weeklySessions} {ar ? "حصص/أسبوع" : "séances/semaine"}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/${locale}/courses`}
          className="rounded-2xl bg-accent px-4 py-2.5 text-center text-xs font-black text-board-900 transition hover:bg-accent-soft"
        >
          {ar ? "الدروس" : "Cours"}
        </Link>
        <Link
          href={`/${locale}/homework`}
          className="rounded-2xl border border-white/15 bg-white/[0.045] px-4 py-2.5 text-center text-xs font-black text-chalk transition hover:border-accent/35 hover:text-accent"
        >
          {ar ? "الواجبات" : "Devoirs"}
        </Link>
      </div>
    </aside>
  );
}
