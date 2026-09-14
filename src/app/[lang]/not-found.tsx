import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="mt-3 text-2xl font-bold text-chalk">Page introuvable — الصفحة غير موجودة</h1>
        <Link
          href="/ar"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-board-900"
        >
          Younes Academy
        </Link>
      </div>
    </main>
  );
}
