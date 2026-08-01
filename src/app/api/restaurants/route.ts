import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const region = searchParams.get("region");
    const cuisine = searchParams.get("cuisine");
    const priority = searchParams.get("priority");
    const q = searchParams.get("q")?.trim();

    const where: {
      status?: string;
      region?: string;
      priority?: string;
      cuisine?: string;
      AND?: { OR: { contains: string }[] }[];
    } = {};

    if (status && status !== "all") where.status = status;
    if (region && region !== "all") where.region = region;
    if (priority && priority !== "all") where.priority = priority;
    if (cuisine && cuisine !== "all") where.cuisine = cuisine;

    if (q) {
      where.AND = [
        {
          OR: [
            { name: { contains: q } },
            { instagram: { contains: q } },
            { phone: { contains: q } },
            { city: { contains: q } },
          ],
        },
      ];
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

    const leads = await db.restaurantLead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    leads.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (pa !== pb) return pa - pb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({ leads });
  } catch (e) {
    console.error("GET /api/restaurants error", e);
    return NextResponse.json({ error: "Failed to fetch restaurants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, instagram, phone, city, region, cuisine, hasWebsite, reservationSystem, priority, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const handle = instagram ? String(instagram).replace(/^@/, "").trim() : null;

    const lead = await db.restaurantLead.create({
      data: {
        name: String(name).trim(),
        instagram: handle,
        phone: phone?.trim() || null,
        city: city?.trim() || null,
        region: region || null,
        cuisine: cuisine || null,
        hasWebsite: hasWebsite ?? false,
        reservationSystem: reservationSystem || null,
        priority: priority || "medium",
        notes: notes || null,
        status: "new",
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    console.error("POST /api/restaurants error", e);
    const msg = e instanceof Error ? e.message : "Failed to create restaurant";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
