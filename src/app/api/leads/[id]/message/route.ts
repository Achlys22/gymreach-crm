import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage, generateMessageVariant } from "@/lib/message-template";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await db.gymLead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    let currentDetail = lead.detail;
    if (body?.detail !== undefined) {
      currentDetail = body.detail || null;
    }

    const leadInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      country: lead.country,
      disciplines: lead.disciplines,
      notes: lead.notes,
      detail: currentDetail,
    };

    const isRegenerate = body?.regenerate === true;
    const message = isRegenerate
      ? generateMessageVariant(leadInfo)
      : generateMessage(leadInfo);

    if (!message) {
      return NextResponse.json({ error: "Failed to generate message." }, { status: 500 });
    }

    await db.gymLead.update({ where: { id: lead.id }, data: { message, detail: currentDetail } });

    return NextResponse.json({
      lead: { ...lead, detail: currentDetail, message },
      message,
      skipped: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/leads/[id]/message error:", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
