import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGymEmail, generateGymEmailVariant } from "@/lib/email-template";

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
    const email = isRegenerate ? generateGymEmailVariant(leadInfo) : generateGymEmail(leadInfo);

    await db.gymLead.update({ where: { id: lead.id }, data: { emailMessage: email, detail: currentDetail } });

    return NextResponse.json({
      lead: { ...lead, detail: currentDetail, emailMessage: email },
      email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/leads/[id]/email error:", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
