import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGymEmail, generateGymEmailVariant } from "@/lib/email-template";
import type { GymLead } from "@/lib/types";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  country: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null;
}

function serializeLead(l: {
  id: string; name: string; instagram: string; city: string | null;
  region: string | null; country: string | null; disciplines: string; status: string; priority: string;
  notes: string | null; detail: string | null; message: string | null; emailMessage: string | null;
  followUpAt: Date | null; contactedAt: Date | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: l.id, name: l.name, instagram: l.instagram, city: l.city,
    region: l.region, country: l.country, disciplines: l.disciplines,
    status: l.status, priority: l.priority, notes: l.notes, detail: l.detail,
    message: l.message, emailMessage: l.emailMessage,
    followUpAt: l.followUpAt?.toISOString() ?? null,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString(),
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await db.gymLead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    let currentDetail = lead.detail;
    if (body?.detail !== undefined) {
      await db.gymLead.update({ where: { id }, data: { detail: body.detail || null } });
      currentDetail = body.detail || null;
    }

    const info: LeadInfo = {
      name: lead.name, instagram: lead.instagram, city: lead.city,
      region: lead.region, country: lead.country, disciplines: lead.disciplines,
      notes: lead.notes, detail: currentDetail,
    };

    const isRegenerate = body?.regenerate === true;
    const email = isRegenerate ? generateGymEmailVariant(info) : generateGymEmail(info);

    const updated = await db.gymLead.update({
      where: { id },
      data: { emailMessage: email },
    });

    return NextResponse.json({ lead: serializeLead(updated), email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/leads/[id]/email error:", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
