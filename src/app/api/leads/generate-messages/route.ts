import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage } from "@/lib/message-template";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
}

// Bulk-generate messages for leads that don't have one yet.
// Body: { ids?: string[] } — if omitted, generates for all leads missing a message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = body.ids;

    const LIMIT = 500; // template-based = instant, no rate limit

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

    // Template-based = instant, no rate limits, no API calls
    for (const lead of leads) {
      try {
        const leadInfo: LeadInfo = {
          name: lead.name,
          instagram: lead.instagram,
          city: lead.city,
          region: lead.region,
          disciplines: lead.disciplines,
          notes: lead.notes,
        };

        const message = generateMessage(leadInfo);

        if (message) {
          await db.gymLead.update({
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

    return NextResponse.json({
      generated,
      failed,
      total: leads.length,
    });
  } catch (e) {
    console.error("POST /api/leads/generate-messages error", e);
    return NextResponse.json({ error: "Bulk generation failed" }, { status: 500 });
  }
}
