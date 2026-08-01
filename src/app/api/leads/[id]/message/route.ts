import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage, generateMessageVariant, SKIP_MESSAGE } from "@/lib/message-template";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null;
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

    const body = await req.json().catch(() => ({}));

    // If a manual detail is provided in the request, save it to the DB
    if (body?.detail !== undefined) {
      await db.gymLead.update({
        where: { id },
        data: { detail: body.detail || null },
      });
      lead.detail = body.detail || null;
    }

    const leadInfo: LeadInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      disciplines: lead.disciplines,
      notes: lead.notes,
      detail: lead.detail,
    };

    const isRegenerate = body?.regenerate === true;
    const message = isRegenerate
      ? generateMessageVariant(leadInfo)
      : generateMessage(leadInfo);

    if (!message) {
      return NextResponse.json(
        { error: "Failed to generate message." },
        { status: 500 }
      );
    }

    // Only save non-SKIP messages to the DB
    const updated = message === SKIP_MESSAGE
      ? lead
      : await db.gymLead.update({
          where: { id },
          data: { message },
        });

    return NextResponse.json({
      lead: updated,
      message,
      skipped: message === SKIP_MESSAGE,
    });
  } catch (e) {
    console.error("POST /api/leads/[id]/message error", e);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
