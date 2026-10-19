import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import {
  readDb,
  uid,
  updateDb,
  type Lead,
  type LeadStatus,
} from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const leads = [...readDb().leads].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return NextResponse.json({ ok: true, leads });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as Partial<Lead> | null;
  if (!body?.name?.trim() || !body?.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const lead: Lead = {
    id: uid("lead"),
    name: body.name.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim() || "",
    source: body.source?.trim() || "Адмін",
    cruise: body.cruise?.trim() || "",
    status: "new",
    notes: body.notes?.trim() || "",
    details: body.details?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };

  updateDb((db) => {
    db.leads.unshift(lead);
  });

  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as
    | (Partial<Lead> & { id?: string; status?: LeadStatus })
    | null;

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  let updated: Lead | null = null;
  updateDb((db) => {
    const index = db.leads.findIndex((lead) => lead.id === body.id);
    if (index < 0) return;
    const current = db.leads[index];
    updated = {
      ...current,
      name: body.name?.trim() ?? current.name,
      phone: body.phone?.trim() ?? current.phone,
      email: body.email?.trim() ?? current.email,
      source: body.source?.trim() ?? current.source,
      cruise: body.cruise?.trim() ?? current.cruise,
      notes: body.notes?.trim() ?? current.notes,
      details: body.details?.trim() ?? current.details,
      status: body.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    db.leads[index] = updated;
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead: updated });
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  updateDb((db) => {
    db.leads = db.leads.filter((lead) => lead.id !== id);
  });

  return NextResponse.json({ ok: true });
}
