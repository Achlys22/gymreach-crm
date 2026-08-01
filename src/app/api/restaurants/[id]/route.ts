import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, notes, message, followUpAt, botDeployed, hasWebsite, reservationSystem } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (message !== undefined) data.message = message;
    if (botDeployed !== undefined) data.botDeployed = botDeployed;
    if (hasWebsite !== undefined) data.hasWebsite = hasWebsite;
    if (reservationSystem !== undefined) data.reservationSystem = reservationSystem;
    if (followUpAt !== undefined) data.followUpAt = followUpAt ? new Date(followUpAt) : null;

    if (status === "contacted") {
      data.contactedAt = new Date();
    }

    const lead = await db.restaurantLead.update({
      where: { id },
      data,
    });

    return NextResponse.json({ lead });
  } catch (e) {
    console.error("PATCH /api/restaurants/[id] error", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.restaurantLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/restaurants/[id] error", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
