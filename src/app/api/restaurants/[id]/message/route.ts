import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantMessage, generateRestaurantMessageVariant, SKIP_MESSAGE } from "@/lib/restaurant-message-template";

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
  notes: string | null;
  detail: string | null;
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

    const body = await req.json().catch(() => ({}));

    // If a manual detail is provided, save it
    if (body?.detail !== undefined) {
      await db.restaurantLead.update({
        where: { id },
        data: { detail: body.detail || null },
      });
      lead.detail = body.detail || null;
    }

    const info: RestaurantInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      cuisine: lead.cuisine,
      reservationSystem: lead.reservationSystem,
      notes: lead.notes,
      detail: lead.detail,
    };

    const isRegenerate = body?.regenerate === true;
    const message = isRegenerate
      ? generateRestaurantMessageVariant(info)
      : generateRestaurantMessage(info);

    if (!message) {
      return NextResponse.json({ error: "Failed to generate message." }, { status: 500 });
    }

    const updated = message === SKIP_MESSAGE
      ? lead
      : await db.restaurantLead.update({
          where: { id },
          data: { message },
        });

    return NextResponse.json({
      lead: updated,
      message,
      skipped: message === SKIP_MESSAGE,
    });
  } catch (e) {
    console.error("POST /api/restaurants/[id]/message error", e);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
