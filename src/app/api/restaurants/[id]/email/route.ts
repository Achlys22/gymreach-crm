import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantEmail, generateRestaurantEmailVariant } from "@/lib/restaurant-email-template";

interface RestaurantInfo {
  name: string; instagram: string | null; city: string | null; region: string | null;
  country: string | null; cuisine: string | null; reservationSystem: string | null;
  notes: string | null; detail: string | null;
}

function serializeLead(l: any) {
  return {
    ...l,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await db.restaurantLead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    let currentDetail = lead.detail;
    if (body?.detail !== undefined) {
      await db.restaurantLead.update({ where: { id }, data: { detail: body.detail || null } });
      currentDetail = body.detail || null;
    }

    const info: RestaurantInfo = {
      name: lead.name, instagram: lead.instagram, city: lead.city, region: lead.region,
      country: lead.country, cuisine: lead.cuisine, reservationSystem: lead.reservationSystem,
      notes: lead.notes, detail: currentDetail,
    };

    const isRegenerate = body?.regenerate === true;
    const email = isRegenerate ? generateRestaurantEmailVariant(info) : generateRestaurantEmail(info);

    const updated = await db.restaurantLead.update({ where: { id }, data: { emailMessage: email } });
    return NextResponse.json({ lead: serializeLead(updated), email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/restaurants/[id]/email error:", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
