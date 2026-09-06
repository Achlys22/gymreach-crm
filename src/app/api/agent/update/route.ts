import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Agent API — update a lead's status after sending a DM.
// Requires X-API-Key header.
//
// Body: { workspace: "gym"|"restaurant", id: "lead-id", status: "contacted" }
//
// Use this after your agent sends a DM to mark the lead as contacted.

function checkAuth(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.AGENT_API_KEY;
  if (!expectedKey) return false;
  return apiKey === expectedKey;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Pass X-API-Key header." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { workspace, id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["new", "contacted", "replied", "interested", "won", "lost", "demo_sent"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      contactedAt: status === "contacted" ? new Date() : undefined,
    };

    if (workspace === "restaurant") {
      const lead = await db.restaurantLead.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ ok: true, lead });
    } else {
      const lead = await db.gymLead.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ ok: true, lead });
    }
  } catch (e) {
    console.error("POST /api/agent/update error", e);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
