import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RestaurantLead } from "@/lib/restaurant-types";

function serializeLead(l: {
  id: string; name: string; instagram: string | null; phone: string | null;
  city: string | null; region: string | null; cuisine: string | null;
  hasWebsite: boolean; reservationSystem: string | null; botDeployed: boolean;
  status: string; priority: string; notes: string | null; detail: string | null;
  message: string | null; followUpAt: Date | null; contactedAt: Date | null;
  createdAt: Date; updatedAt: Date;
}): RestaurantLead {
  return {
    id: l.id, name: l.name, instagram: l.instagram, phone: l.phone,
    city: l.city, region: l.region, cuisine: l.cuisine,
    hasWebsite: l.hasWebsite, reservationSystem: l.reservationSystem,
    botDeployed: l.botDeployed, status: l.status, priority: l.priority,
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
    const { status, priority, notes, detail, message, followUpAt, botDeployed, hasWebsite, reservationSystem } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (detail !== undefined) data.detail = detail || null;
    if (message !== undefined) data.message = message;
    if (botDeployed !== undefined) data.botDeployed = botDeployed;
    if (hasWebsite !== undefined) data.hasWebsite = hasWebsite;
    if (reservationSystem !== undefined) data.reservationSystem = reservationSystem;
    if (followUpAt !== undefined) data.followUpAt = followUpAt ? new Date(followUpAt) : null;

    if (status === "contacted") {
      data.contactedAt = new Date();
    }

    const lead = await db.restaurantLead.update({ where: { id }, data });
    return NextResponse.json({ lead: serializeLead(lead) });
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
