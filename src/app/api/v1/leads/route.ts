import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrationLeads } from "@/db/lead-schema";
import { ensureLeadsSchema } from "@/lib/leads/ensure-leads-schema";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").replace(/^\+2120/, "+212");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const fullName = cleanText(body?.fullName, 120);
    const phone = normalizePhone(cleanText(body?.phone, 32));
    const level = cleanText(body?.level, 80);
    const subject = cleanText(body?.subject, 120);
    const source = cleanText(body?.source, 80) || "landing_page";
    const message = cleanText(body?.message, 500) || null;

    if (!fullName || !phone || !level || !subject) {
      return NextResponse.json(
        { ok: false, error: "missing_required_fields" },
        { status: 400 },
      );
    }

    await ensureLeadsSchema();

    const [lead] = await db
      .insert(registrationLeads)
      .values({ fullName, phone, level, subject, source, message })
      .returning({ id: registrationLeads.id, createdAt: registrationLeads.createdAt });

    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error("lead_create_failed", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
