import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_LEADS } from "@/lib/seed-data";

export async function POST() {
  try {
    let inserted = 0;
    let skipped = 0;

    for (const seed of SEED_LEADS) {
      const exists = await db.gymLead.findUnique({
        where: { instagram: seed.instagram },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await db.gymLead.create({
        data: {
          name: seed.name,
          instagram: seed.instagram,
          city: seed.city || null,
          region: seed.region,
          disciplines: seed.disciplines,
          notes: seed.notes || null,
          status: "new",
          priority: "medium",
        },
      });
      inserted++;
    }

    const total = await db.gymLead.count();
    return NextResponse.json({ inserted, skipped, total });
  } catch (e) {
    console.error("POST /api/leads/seed error", e);
    return NextResponse.json({ error: "Failed to seed leads" }, { status: 500 });
  }
}
