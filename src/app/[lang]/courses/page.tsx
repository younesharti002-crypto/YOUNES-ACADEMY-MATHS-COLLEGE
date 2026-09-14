import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentCourses } from "@/components/content/StudentCourses";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function CoursesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang === "fr" ? "fr" : "ar";
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await getAuthenticatedSession(token) : null;

  if (!session || session.user.role !== "STUDENT") {
    redirect(`/${locale}/login`);
  }

  return <StudentCourses lang={locale} />;
}
