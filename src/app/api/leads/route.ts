import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const region = searchParams.get("region");
    const country = searchParams.get("country");
    const discipline = searchParams.get("discipline");
    const priority = searchParams.get("priority");
    const q = searchParams.get("q")?.trim();

    const where: {
      status?: string;
      region?: string;
      country?: string;
      priority?: string;
      AND?: { OR: { contains: string }[] }[];
    } = {};

    if (status && status !== "all") where.status = status;
    if (region && region !== "all") where.region = region;
    if (country && country !== "all") where.country = country;
    if (priority && priority !== "all") where.priority = priority;

    if (q) {
      where.AND = [
        {
          OR: [
            { name: { contains: q } },
            { instagram: { contains: q } },
            { city: { contains: q } },
          ],
        },
      ];
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

    const leads = await db.gymLead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    // sort by priority (high first) then created desc
    leads.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (pa !== pb) return pa - pb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const filtered =
      discipline && discipline !== "all"
        ? leads.filter((l) =>
            l.disciplines
              .split(",")
              .map((d) => d.trim())
              .includes(discipline)
          )
        : leads;

    return NextResponse.json({
      leads: filtered.map((l) => ({
        ...l,
        followUpAt: l.followUpAt?.toISOString() ?? null,
        contactedAt: l.contactedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/leads error", e);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, instagram, city, region, country, disciplines, priority, notes } = body;

    if (!name || !instagram) {
      return NextResponse.json({ error: "name and instagram are required" }, { status: 400 });
    }

    const handle = String(instagram).replace(/^@/, "").trim();

    const lead = await db.gymLead.create({
      data: {
        name: String(name).trim(),
        instagram: handle,
        city: city?.trim() || null,
        region: region || null,
        country: country || "UK",
        disciplines: disciplines || "",
        priority: priority || "medium",
        notes: notes || null,
        status: "new",
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads error", e);
    const msg = e instanceof Error ? e.message : "Failed to create lead";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
