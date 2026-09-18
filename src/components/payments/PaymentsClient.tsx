"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Student = {
  profileId: string;
  fullName: string;
  studentCode: string;
  levelName: string;
  groupId: string | null;
  groupName: string | null;
};

type Scope = {
  groupId: string;
  subjectId: string;
  subjectName: string;
};

type Billing = {
  id: string;
  studentProfileId: string;
  subjectId: string;
  billingMonth: string;
  expectedAmountCentimes: number;
  paidAmountCentimes: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  studentName: string;
  studentCode: string;
  subjectName: string;
  levelName: string;
};

type Transaction = {
  id: string;
  billingItemId: string;
  amountCentimes: number;
  teacherShareCentimes: number;
  schoolShareCentimes: number;
  academyShareCentimes: number;
  method: "CASH" | "TRANSFER" | "OTHER";
  reference: string | null;
  notes: string | null;
  receivedAt: string;
};

type Payload = {
  students: Student[];
  scopes: Scope[];
  billing: Billing[];
  transactions: Transaction[];
};

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Operation failed");
  }
  return payload;
}

function dh(centimes: number) {
  return (centimes / 100).toFixed(2).replace(".00", "") + " DH";
}

export function PaymentsClient({ locale }: { locale: "ar" | "fr" }) {
  const rtl = locale === "ar";
  const [data, setData] = useState<Payload>({
    students: [],
    scopes: [],
    billing: [],
    transactions: [],
  });
  const [selectedStudent, setSelectedStudent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const payload = await api("/api/v1/admin/payments");
      setData(payload.data as Payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentStudent = data.students.find(
    (student) => student.profileId === selectedStudent,
  );

  const availableSubjects = useMemo(() => {
    if (!currentStudent?.groupId) return [];
    return data.scopes.filter((scope) => scope.groupId === currentStudent.groupId);
  }, [currentStudent, data.scopes]);

  const totals = useMemo(() => {
    return data.transactions.reduce(
      (acc, row) => ({
        total: acc.total + row.amountCentimes,
        teacher: acc.teacher + row.teacherShareCentimes,
        school: acc.school + row.schoolShareCentimes,
        academy: acc.academy + row.academyShareCentimes,
      }),
      { total: 0, teacher: 0, school: 0, academy: 0 },
    );
  }, [data.transactions]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const amountDh = Number(fd.get("amountDh"));
    setBusy(true);
    setMessage("");

    try {
      await api("/api/v1/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId: fd.get("studentProfileId"),
          subjectId: fd.get("subjectId"),
          billingMonth: fd.get("billingMonth"),
          amountDh,
          method: fd.get("method"),
          reference: fd.get("reference"),
          notes: fd.get("notes"),
        }),
      });
      setMessage(rtl ? "تم تسجيل الأداء بنجاح." : "Paiement enregistré.");
      form.reset();
      setSelectedStudent("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-board-900 px-4 py-8 text-chalk sm:px-6 lg:px-10"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-accent/20 bg-white/[0.045] p-6 sm:p-8">
          <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-black text-accent">
            FINANCE
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            {rtl ? "الأداءات وتقسيم المداخيل" : "Paiements & répartition"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-chalk-dim">
            {rtl
              ? "كل أداء شهري مرتبط بالتلميذ والمادة، والتقسيم يتم تلقائياً: 50% للأستاذ، 30% للمدرسة، 20% للأكاديمية."
              : "Chaque paiement mensuel est lié à l’élève et à la matière. Répartition automatique : 50% professeur, 30% école, 20% Academy."}
          </p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric value={dh(totals.total)} label={rtl ? "المداخيل المسجلة" : "Encaissements"} />
          <Metric value={dh(totals.teacher)} label={rtl ? "حصة الأساتذة 50%" : "Part profs 50%"} />
          <Metric value={dh(totals.school)} label={rtl ? "حصة المدرسة 30%" : "Part école 30%"} />
          <Metric value={dh(totals.academy)} label={rtl ? "حصة Academy 20%" : "Part Academy 20%"} />
        </section>

        {message && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/[0.08] px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">
            {rtl ? "تسجيل أداء" : "Enregistrer un paiement"}
          </h2>

          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select
              name="studentProfileId"
              required
              value={selectedStudent}
              onChange={(event) => setSelectedStudent(event.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                {rtl ? "اختر التلميذ" : "Choisir l’élève"}
              </option>
              {data.students.map((student) => (
                <option key={student.profileId} value={student.profileId}>
                  {student.fullName} · {student.studentCode} · {student.levelName}
                </option>
              ))}
            </select>

            <select name="subjectId" required className={inputClass} defaultValue="">
              <option value="" disabled>
                {rtl ? "اختر المادة" : "Choisir la matière"}
              </option>
              {availableSubjects.map((scope) => (
                <option key={scope.subjectId} value={scope.subjectId}>
                  {scope.subjectName}
                </option>
              ))}
            </select>

            <input
              name="billingMonth"
              type="month"
              required
              className={inputClass}
            />

            <input
              name="amountDh"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder={rtl ? "المبلغ بالدرهم" : "Montant en DH"}
              className={inputClass}
            />

            <select name="method" className={inputClass} defaultValue="CASH">
              <option value="CASH">{rtl ? "نقداً" : "Espèces"}</option>
              <option value="TRANSFER">{rtl ? "تحويل" : "Virement"}</option>
              <option value="OTHER">{rtl ? "أخرى" : "Autre"}</option>
            </select>

            <input
              name="reference"
              maxLength={200}
              placeholder={rtl ? "مرجع الأداء (اختياري)" : "Référence (optionnel)"}
              className={inputClass}
            />

            <textarea
              name="notes"
              maxLength={1000}
              placeholder={rtl ? "ملاحظات" : "Notes"}
              className={inputClass + " md:col-span-2 xl:col-span-2 min-h-20"}
            />

            <button disabled={busy} className={buttonClass}>
              {busy ? (rtl ? "جاري الحفظ..." : "Enregistrement...") : rtl ? "حفظ الأداء" : "Enregistrer"}
            </button>
          </form>

          {currentStudent && (
            <p className="mt-3 text-xs text-white/40">
              {rtl ? "الثمن الشهري للمادة:" : "Tarif mensuel par matière :"}{" "}
              {["4AP", "5AP", "6AP"].includes(currentStudent.levelName) ? "100 DH" : "200 DH"}
            </p>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-xl font-black">
              {rtl ? "الفواتير الشهرية" : "Factures mensuelles"}
            </h2>
          </div>

          {data.billing.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/35">
              {rtl ? "مازال ما تسجل حتى أداء." : "Aucun paiement enregistré."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-white/[0.04] text-xs text-white/45">
                  <tr>
                    <th className="p-4 text-start">{rtl ? "التلميذ" : "Élève"}</th>
                    <th className="p-4 text-start">{rtl ? "المادة" : "Matière"}</th>
                    <th className="p-4 text-start">{rtl ? "الشهر" : "Mois"}</th>
                    <th className="p-4 text-start">{rtl ? "المطلوب" : "Attendu"}</th>
                    <th className="p-4 text-start">{rtl ? "المؤدى" : "Payé"}</th>
                    <th className="p-4 text-start">{rtl ? "الباقي" : "Reste"}</th>
                    <th className="p-4 text-start">{rtl ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.billing.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="p-4">
                        <p className="font-bold">{row.studentName}</p>
                        <p className="text-xs text-white/35">{row.studentCode} · {row.levelName}</p>
                      </td>
                      <td className="p-4">{row.subjectName}</td>
                      <td className="p-4">{row.billingMonth.slice(0, 7)}</td>
                      <td className="p-4">{dh(row.expectedAmountCentimes)}</td>
                      <td className="p-4 font-black text-emerald-300">{dh(row.paidAmountCentimes)}</td>
                      <td className="p-4">{dh(row.expectedAmountCentimes - row.paidAmountCentimes)}</td>
                      <td className="p-4">
                        <Status status={row.status} rtl={rtl} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-2xl font-black text-accent">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/45">{label}</p>
    </div>
  );
}

function Status({
  status,
  rtl,
}: {
  status: "UNPAID" | "PARTIAL" | "PAID";
  rtl: boolean;
}) {
  const label =
    status === "PAID"
      ? rtl
        ? "خالص"
        : "Payé"
      : status === "PARTIAL"
        ? rtl
          ? "جزئي"
          : "Partiel"
        : rtl
          ? "غير خالص"
          : "Impayé";

  const style =
    status === "PAID"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
      : status === "PARTIAL"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
        : "border-red-300/20 bg-red-300/10 text-red-300";

  return (
    <span className={"rounded-full border px-2.5 py-1 text-xs font-black " + style}>
      {label}
    </span>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent/60";
const buttonClass =
  "rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-board-900 disabled:cursor-not-allowed disabled:opacity-50";
