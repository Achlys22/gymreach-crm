import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantMessage, generateRestaurantMessageVariant, SKIP_MESSAGE } from "@/lib/restaurant-message-template";
import type { RestaurantLead } from "@/lib/restaurant-types";

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

// Convert a Prisma RestaurantLead to a plain serializable object
function serializeLead(l: {
  id: string;
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  cuisine: string | null;
  hasWebsite: boolean;
  reservationSystem: string | null;
  botDeployed: boolean;
  status: string;
  priority: string;
  notes: string | null;
  detail: string | null;
  message: string | null;
  followUpAt: Date | null;
  contactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): RestaurantLead {
  return {
    id: l.id,
    name: l.name,
    instagram: l.instagram,
    phone: l.phone,
    city: l.city,
    region: l.region,
    country: l.country,
    cuisine: l.cuisine,
    hasWebsite: l.hasWebsite,
    reservationSystem: l.reservationSystem,
    botDeployed: l.botDeployed,
    status: l.status,
    priority: l.priority,
    notes: l.notes,
    detail: l.detail,
    message: l.message,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
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

    let currentDetail = lead.detail;
    if (body?.detail !== undefined) {
      await db.restaurantLead.update({
        where: { id },
        data: { detail: body.detail || null },
      });
      currentDetail = body.detail || null;
    }

    const info: RestaurantInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      cuisine: lead.cuisine,
      reservationSystem: lead.reservationSystem,
      notes: lead.notes,
      detail: currentDetail,
    };

    const isRegenerate = body?.regenerate === true;
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

    const responseBody = {
      lead: serializeLead(updated),
      message,
      skipped: message === SKIP_MESSAGE,
    };

    return NextResponse.json(responseBody);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/restaurants/[id]/message error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg.slice(0, 200) },
      { status: 500 }
    );
  }
}
