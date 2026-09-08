import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRestaurantEmail } from "@/lib/restaurant-email-template";

interface RestaurantInfo {
  name: string; instagram: string | null; city: string | null; region: string | null;
  country: string | null; cuisine: string | null; reservationSystem: string | null;
  notes: string | null; detail: string | null;
}

export async function POST(_req: NextRequest) {
  try {
    const leads = await db.restaurantLead.findMany({
      where: { emailMessage: null },
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
          name: lead.name, instagram: lead.instagram, city: lead.city, region: lead.region,
          country: lead.country, cuisine: lead.cuisine, reservationSystem: lead.reservationSystem,
          notes: lead.notes, detail: lead.detail,
        };
        const email = generateRestaurantEmail(info);
        if (email) {
          await db.restaurantLead.update({ where: { id: lead.id }, data: { emailMessage: email } });
          generated++;
        } else { failed++; }
      } catch { failed++; }
    }

    return NextResponse.json({ generated, failed, total: leads.length });
  } catch (e) {
    console.error("POST /api/restaurants/generate-emails error", e);
    return NextResponse.json({ error: "Bulk generation failed" }, { status: 500 });
  }
}
