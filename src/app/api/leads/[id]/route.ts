import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, notes, detail, followUpAt } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (detail !== undefined) data.detail = detail || null;
    if (followUpAt !== undefined) data.followUpAt = followUpAt ? new Date(followUpAt) : null;

    // auto-set contactedAt when moving to "contacted"
    if (status === "contacted") {
      data.contactedAt = new Date();
    }

    const lead = await db.gymLead.update({
      where: { id },
      data,
    });

    return NextResponse.json({ lead });
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
