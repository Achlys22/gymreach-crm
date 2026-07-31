import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage, generateMessageVariant } from "@/lib/message-template";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await db.gymLead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadInfo: LeadInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      disciplines: lead.disciplines,
      notes: lead.notes,
    };

    // Check if this is a "regenerate" request (lead already has a message)
    const body = await req.json().catch(() => ({}));
    const isRegenerate = body?.regenerate === true || !!lead.message;

    const message = isRegenerate
      ? generateMessageVariant(leadInfo)
      : generateMessage(leadInfo);

    if (!message) {
      return NextResponse.json(
        { error: "Failed to generate message." },
        { status: 500 }
      );
    }

    // Save to DB
    const updated = await db.gymLead.update({
      where: { id },
      data: { message },
    });

    return NextResponse.json({ lead: updated, message });
  } catch (e) {
    console.error("POST /api/leads/[id]/message error", e);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
