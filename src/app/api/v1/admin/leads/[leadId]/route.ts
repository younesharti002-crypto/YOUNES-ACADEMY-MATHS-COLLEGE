import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { registrationLeads } from "@/db/lead-schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { ensureLeadsSchema } from "@/lib/leads/ensure-leads-schema";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = ["NEW", "CONTACTED", "REGISTERED", "ARCHIVED"] as const;
type LeadStatus = (typeof STATUSES)[number];

function redirectBack(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (referer) return NextResponse.redirect(referer, { status: 303 });
  return NextResponse.redirect(new URL("/ar/admin/leads", request.url), { status: 303 });
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function normalizeStatus(value: FormDataEntryValue | null): LeadStatus | null {
  if (typeof value !== "string") return null;
  return STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : null;
}

async function requireAdmin(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) return false;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) return jsonError(403, "ADMIN_REQUIRED", "Admin access required.");

  const { leadId } = await params;
  if (!UUID_PATTERN.test(leadId)) {
    return jsonError(400, "INVALID_LEAD", "Invalid lead id.");
  }

  const formData = await request.formData().catch(() => null);
  const status = normalizeStatus(formData?.get("status") ?? null);

  if (!status) {
    return jsonError(400, "INVALID_STATUS", "Invalid lead status.");
  }

  await ensureLeadsSchema();

  await db
    .update(registrationLeads)
    .set({ status, updatedAt: new Date() })
    .where(eq(registrationLeads.id, leadId));

  return redirectBack(request);
}
