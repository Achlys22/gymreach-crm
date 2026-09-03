import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Agent API — read leads with their generated messages.
// Requires X-API-Key header matching AGENT_API_KEY env var.
//
// Query params:
//   ?workspace=gym|restaurant  (default: gym)
//   ?country=UK|Denmark|Norway|Sweden
//   ?status=new|contacted|replied|...
//   ?has_message=true           (only leads with generated messages)
//   ?limit=50                   (default 50, max 500)
//
// Returns: { leads: [{ id, name, instagram, message, city, country, ... }] }

function checkAuth(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.AGENT_API_KEY;
  if (!expectedKey) return false; // no key configured = no access
  return apiKey === expectedKey;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Pass X-API-Key header." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const workspace = searchParams.get("workspace") || "gym";
    const country = searchParams.get("country");
    const status = searchParams.get("status");
    const hasMessage = searchParams.get("has_message") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);

    if (workspace === "restaurant") {
      const where: Record<string, unknown> = {};
      if (country && country !== "all") where.country = country;
      if (status && status !== "all") where.status = status;
      if (hasMessage) where.message = { not: null };

      const leads = await db.restaurantLead.findMany({
        where,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          instagram: true,
          phone: true,
          city: true,
          region: true,
          country: true,
          cuisine: true,
          status: true,
          priority: true,
          message: true,
          notes: true,
        },
      });

      // Filter to only leads with Instagram + message (for automation)
      const automatable = leads.filter((l) => l.instagram && l.message);

      return NextResponse.json({
        workspace: "restaurant",
        total: automatable.length,
        leads: automatable.map((l) => ({
          ...l,
          instagram_handle: l.instagram,
          instagram_url: `https://instagram.com/${l.instagram}`,
          message: l.message,
        })),
      });
    } else {
      // Gym workspace
      const where: Record<string, unknown> = {};
      if (country && country !== "all") where.country = country;
      if (status && status !== "all") where.status = status;
      if (hasMessage) where.message = { not: null };

      const leads = await db.gymLead.findMany({
        where,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          instagram: true,
          city: true,
          region: true,
          country: true,
          disciplines: true,
          status: true,
          priority: true,
          message: true,
          notes: true,
        },
      });

      // Filter to only leads with a generated message (for automation)
      const automatable = leads.filter((l) => l.message);

      return NextResponse.json({
        workspace: "gym",
        total: automatable.length,
        leads: automatable.map((l) => ({
          ...l,
          instagram_handle: l.instagram,
          instagram_url: `https://instagram.com/${l.instagram}`,
        })),
      });
    }
  } catch (e) {
    console.error("GET /api/agent/leads error", e);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
