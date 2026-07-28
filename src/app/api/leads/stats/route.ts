import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/constants";

export async function GET() {
  try {
    const total = await db.gymLead.count();

    const byStatus = await db.gymLead.groupBy({
      by: ["status"],
      _count: true,
    });

    const byRegion = await db.gymLead.groupBy({
      by: ["region"],
      _count: true,
    });

    const byPriority = await db.gymLead.groupBy({
      by: ["priority"],
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const s of LEAD_STATUSES) statusCounts[s] = 0;
    for (const row of byStatus) statusCounts[row.status] = row._count;

    const regionCounts: Record<string, number> = {};
    for (const row of byRegion) regionCounts[row.region ?? "Unknown"] = row._count;

    const priorityCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };
    for (const row of byPriority) priorityCounts[row.priority] = row._count;

    return NextResponse.json({
      total,
      byStatus: statusCounts,
      byRegion: regionCounts,
      byPriority: priorityCounts,
    });
  } catch (e) {
    console.error("GET /api/leads/stats error", e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
