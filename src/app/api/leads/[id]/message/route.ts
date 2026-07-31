import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// Shared prompt builder — used by both single + bulk endpoints
export function buildMessagePrompt(lead: {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
}): { system: string; user: string } {
  const disciplines = lead.disciplines || "MMA / martial arts";
  const city = lead.city || lead.region || "the UK";
  const notes = lead.notes?.replace(/\[.*?\]/g, "").trim() || "";

  const system = `You are a cold outreach expert who writes short, high-converting Instagram DMs for a Google Ads freelancer targeting UK martial arts gyms.

Your offer: First month FREE (no management fee), client only covers ad spend (~£150-300), no contract, no long-term commitment. One-month test to prove value.

Your writing rules:
- MAX 600 characters (Instagram DM limit is ~1000, but short = better)
- First line MUST be a specific personalization hook — reference something about THIS gym (their discipline, city, or a detail from notes). NEVER generic phrases like "I came across your gym" or "really liked what you're offering".
- Second line: state the offer concretely with numbers (£150-300 ad spend, first month free, no contract)
- Last line: low-friction CTA — offer a 2-min Loom video showing what ads you'd run for their gym specifically. NOT "quick chat" or "call".
- Tone: casual, confident, peer-to-peer. Not salesy. Not formal.
- Use the gym's actual name once naturally
- Don't use emojis unless the gym's name/style suggests it
- Don't use "Hi there" or "Dear" — open with the hook directly
- Output ONLY the DM text, no quotes, no preamble, no explanation`;

  const user = `Write a personalized cold DM for this gym:

Gym name: ${lead.name}
Instagram: @${lead.instagram}
City: ${city}
Disciplines: ${disciplines}
Extra context: ${notes || "none"}

Write the DM now:`;

  return { system, user };
}

// Generate one message via LLM with retry
export async function generateMessage(
  lead: {
    name: string;
    instagram: string;
    city: string | null;
    region: string | null;
    disciplines: string;
    notes: string | null;
  },
  retries = 2
): Promise<string | null> {
  const { system, user } = buildMessagePrompt(lead);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text && text.length > 20 && text.length < 1500) {
        return text;
      }
    } catch (e) {
      if (attempt === retries) {
        console.error("LLM generate failed for", lead.instagram, e);
        return null;
      }
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
  return null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await db.gymLead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const message = await generateMessage(lead);

    if (!message) {
      return NextResponse.json(
        { error: "Failed to generate message. Try again." },
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
