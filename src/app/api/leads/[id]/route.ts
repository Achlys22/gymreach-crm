import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { GymLead } from "@/lib/types";

function serializeLead(l: {
  id: string; name: string; instagram: string; city: string | null;
  region: string | null; country: string | null; disciplines: string; status: string; priority: string;
  notes: string | null; detail: string | null; message: string | null;
  followUpAt: Date | null; contactedAt: Date | null; createdAt: Date; updatedAt: Date;
}): GymLead {
  return {
    id: l.id, name: l.name, instagram: l.instagram, city: l.city,
    region: l.region, country: l.country, disciplines: l.disciplines, status: l.status, priority: l.priority,
    notes: l.notes, detail: l.detail, message: l.message,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, notes, detail, country, message, followUpAt } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (detail !== undefined) data.detail = detail || null;
    if (country !== undefined) data.country = country || null;
    if (message !== undefined) data.message = message;
    if (followUpAt !== undefined) data.followUpAt = followUpAt ? new Date(followUpAt) : null;

    if (status === "contacted") {
      data.contactedAt = new Date();
    }

    const lead = await db.gymLead.update({ where: { id }, data });
    return NextResponse.json({ lead: serializeLead(lead) });
  } catch (e) {
    console.error("PATCH /api/leads/[id] error", e);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.gymLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/leads/[id] error", e);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
