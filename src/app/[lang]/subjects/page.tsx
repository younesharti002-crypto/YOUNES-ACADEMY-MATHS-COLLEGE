import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getStudentSubjects } from "@/lib/student/student-subjects";

export default async function StudentSubjectsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token).catch(() => null) : null;

  if (!session || session.user.role !== "STUDENT") {
    redirect(`/${lang}/login`);
  }

  const subjects = await getStudentSubjects(session.user.id).catch(() => []);
  const ar = lang === "ar";

  return (
    <main className="min-h-screen bg-[#f3f1ec] text-[#111827]" dir={ar ? "rtl" : "ltr"}>
      <div className="border-b border-black/[0.06] bg-board-900 text-chalk">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${lang}/dashboard`} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-black text-accent">TSA</span>
            <span>
              <span className="block text-sm font-black">THE SECRET</span>
              <span className="block text-[9px] uppercase tracking-[0.25em] text-accent">Academy</span>
            </span>
          </Link>
          <Link href={`/${lang}/dashboard`} className="ms-auto rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-chalk-dim transition hover:border-accent/40 hover:text-accent">
            {ar ? "العودة للوحة" : "Retour dashboard"}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-7 rounded-[2rem] border border-[#e4e1d9] bg-white p-6 shadow-[0_14px_35px_rgba(20,24,32,0.05)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9a741d]">
            {ar ? "فضاء التلميذ" : "Espace élève"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {ar ? "موادي" : "Mes matières"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#77736b]">
            {ar
              ? "هنا كيبانو المواد المرتبطة بالمستوى والشعبة ديالك، مع عدد الحصص الأسبوعية وروابط الدروس والواجبات."
              : "Ici apparaissent les matières liées à votre niveau et votre filière, avec le nombre de séances par semaine et les liens vers cours et devoirs."}
          </p>
        </header>

        {subjects.length === 0 ? (
          <section className="rounded-[2rem] border border-[#e4e1d9] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black">
              {ar ? "مازال ما تعيناتش المواد لهذا الحساب." : "Aucune matière n’est encore associée à ce compte."}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#77736b]">
              {ar
                ? "الإدارة خاصها تكمل ربط المستوى والشعبة أو تفعيل المواد لهذا التلميذ."
                : "L’administration doit finaliser le niveau, la filière ou l’activation des matières de cet élève."}
            </p>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <article
                key={`${subject.levelName}-${subject.streamName || "core"}-${subject.subjectName}`}
                className="rounded-[2rem] border border-[#e4e1d9] bg-white p-5 shadow-[0_14px_35px_rgba(20,24,32,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a741d]">
                      {subject.levelName}{subject.streamName ? ` · ${subject.streamName}` : ""}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#111827]">{subject.subjectName}</h2>
                  </div>
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-board-900 text-sm font-black text-accent">
                    {subject.subjectName.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-[#eee8d4] bg-[#fffaf0] p-4">
                  <p className="text-xs font-bold text-[#8a6718]">
                    {ar ? "عدد الحصص الأسبوعية" : "Séances par semaine"}
                  </p>
                  <p className="mt-1 text-3xl font-black text-[#111827]">{subject.weeklySessions}</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href={`/${lang}/courses`}
                    className="rounded-2xl bg-accent px-4 py-3 text-center text-xs font-black text-board-900 transition hover:bg-accent-soft"
                  >
                    {ar ? "الدروس" : "Cours"}
                  </Link>
                  <Link
                    href={`/${lang}/homework`}
                    className="rounded-2xl border border-[#ded6c1] bg-white px-4 py-3 text-center text-xs font-black text-[#5d574c] transition hover:border-[#d1a636] hover:text-[#9a741d]"
                  >
                    {ar ? "الواجبات" : "Devoirs"}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
