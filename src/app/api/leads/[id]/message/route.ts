import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateMessage, generateMessageVariant, SKIP_MESSAGE } from "@/lib/message-template";
import type { GymLead } from "@/lib/types";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null;
}

// Convert a Prisma GymLead to a plain serializable object
// (prevents "cyclic object value" errors from Prisma internals)
function serializeLead(l: {
  id: string;
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  country: string | null;
  disciplines: string;
  status: string;
  priority: string;
  notes: string | null;
  detail: string | null;
  message: string | null;
  followUpAt: Date | null;
  contactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GymLead {
  return {
    id: l.id,
    name: l.name,
    instagram: l.instagram,
    city: l.city,
    region: l.region,
    country: l.country,
    disciplines: l.disciplines,
    status: l.status,
    priority: l.priority,
    notes: l.notes,
    detail: l.detail,
    message: l.message,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
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

    // If a manual detail is provided, save it
    let currentDetail = lead.detail;
    if (body?.detail !== undefined) {
      await db.gymLead.update({
        where: { id },
        data: { detail: body.detail || null },
      });
      currentDetail = body.detail || null;
    }

    const leadInfo: LeadInfo = {
      name: lead.name,
      instagram: lead.instagram,
      city: lead.city,
      region: lead.region,
      disciplines: lead.disciplines,
      notes: lead.notes,
      detail: currentDetail,
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

    // Save the message and fetch the updated lead
    const updated = await db.gymLead.update({
      where: { id },
      data: { message },
    });

    // Build response as a plain object to avoid any serialization issues
    const responseBody = {
      lead: serializeLead(updated),
      message,
      skipped: message === SKIP_MESSAGE,
    };

    return NextResponse.json(responseBody);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/leads/[id]/message error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg.slice(0, 200) },
      { status: 500 }
    );
  }
}
