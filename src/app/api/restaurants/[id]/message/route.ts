import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantMessage, generateRestaurantMessageVariant } from "@/lib/restaurant-message-template";

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
  notes: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await db.restaurantLead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const info: RestaurantInfo = {
      name: lead.name,
      instagram: lead.instagram,
      phone: lead.phone,
      city: lead.city,
      region: lead.region,
      cuisine: lead.cuisine,
      reservationSystem: lead.reservationSystem,
      notes: lead.notes,
    };

    const body = await req.json().catch(() => ({}));
    const isRegenerate = body?.regenerate === true || !!lead.message;

    const message = isRegenerate
      ? generateRestaurantMessageVariant(info)
      : generateRestaurantMessage(info);

    if (!message) {
      return NextResponse.json({ error: "Failed to generate message." }, { status: 500 });
    }

    const updated = await db.restaurantLead.update({
      where: { id },
      data: { message },
    });

    return NextResponse.json({ lead: updated, message });
  } catch (e) {
    console.error("POST /api/restaurants/[id]/message error", e);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
