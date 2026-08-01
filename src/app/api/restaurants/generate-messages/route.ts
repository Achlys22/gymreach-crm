import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantMessage } from "@/lib/restaurant-message-template";

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

export async function POST(_req: NextRequest) {
  try {
    const leads = await db.restaurantLead.findMany({
      where: { message: null },
      take: 500,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (leads.length === 0) {
      return NextResponse.json({ generated: 0, failed: 0, total: 0 });
    }

    let generated = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
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
        const message = generateRestaurantMessage(info);
        if (message) {
          await db.restaurantLead.update({
            where: { id: lead.id },
            data: { message },
          });
          generated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ generated, failed, total: leads.length });
  } catch (e) {
    console.error("POST /api/restaurants/generate-messages error", e);
    return NextResponse.json({ error: "Bulk generation failed" }, { status: 500 });
  }
}
