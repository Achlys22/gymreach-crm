import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage } from "../[id]/message/route";

// Bulk-generate messages for leads that don't have one yet.
// Body: { ids?: string[] } — if omitted, generates for all leads missing a message
// (limited to 50 per call to respect rate limits)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = body.ids;

    const LIMIT = 50;

    let leads;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      leads = await db.gymLead.findMany({
        where: { id: { in: ids.slice(0, LIMIT) } },
      });
    } else {
      leads = await db.gymLead.findMany({
        where: { message: null },
        take: LIMIT,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
    }

    if (leads.length === 0) {
      return NextResponse.json({
        generated: 0,
        skipped: 0,
        message: "No leads to process (all filtered leads already have messages).",
      });
    }

    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Generate sequentially to respect rate limits (parallel = 429s)
    for (const lead of leads) {
      const msg = await generateMessage(lead);
      if (msg) {
        await db.gymLead.update({
          where: { id: lead.id },
          data: { message: msg },
        });
        generated++;
      } else {
        failed++;
        errors.push(lead.instagram);
      }
    }

    return NextResponse.json({
      generated,
      failed,
      total: leads.length,
      errors: errors.slice(0, 5),
    });
  } catch (e) {
    console.error("POST /api/leads/generate-messages error", e);
    return NextResponse.json({ error: "Bulk generation failed" }, { status: 500 });
  }
}
