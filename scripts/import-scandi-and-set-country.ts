/**
 * Set country=UK on all existing gym + restaurant leads (they're all UK-based).
 * Then import the Scandinavian gym leads from /tmp/scandi_gym_leads.json
 */
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";

interface ScandiLead {
  handle: string;
  name: string;
  city: string | null;
  country: string;
  discipline: string;
  source: string;
  snippet: string;
}

async function main() {
  // 1. Set country=UK on all existing leads
  console.log("Setting country=UK on existing gym leads...");
  const gymResult = await db.gymLead.updateMany({
    where: { country: null },
    data: { country: "UK" },
  });
  console.log(`  Updated ${gymResult.count} gym leads → country=UK`);

  console.log("Setting country=UK on existing restaurant leads...");
  const restResult = await db.restaurantLead.updateMany({
    where: { country: null },
    data: { country: "UK" },
  });
  console.log(`  Updated ${restResult.count} restaurant leads → country=UK`);

  // 2. Import Scandinavian gym leads
  if (!existsSync("/tmp/scandi_gym_leads.json")) {
    console.log("\nNo /tmp/scandi_gym_leads.json found — skipping Scandinavian import");
    return;
  }

  const scandiLeads: ScandiLead[] = JSON.parse(readFileSync("/tmp/scandi_gym_leads.json", "utf-8"));
  console.log(`\nImporting ${scandiLeads.length} Scandinavian gym leads...`);

  let imported = 0;
  let skipped = 0;

  for (const lead of scandiLeads) {
    try {
      const existing = await db.gymLead.findUnique({
        where: { instagram: lead.handle },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await db.gymLead.create({
        data: {
          name: lead.name,
          instagram: lead.handle,
          city: lead.city,
          region: lead.country, // Denmark/Norway/Sweden as region for now
          country: lead.country,
          disciplines: lead.discipline || "MMA",
          priority: lead.source === "LLM" ? "low" : "medium",
          notes: lead.snippet ? `[${lead.source}] ${lead.snippet.slice(0, 200)}` : `[${lead.source}]`,
          status: "new",
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicates): ${skipped}`);

  // 3. Final counts
  const totalGym = await db.gymLead.count();
  const totalRest = await db.restaurantLead.count();
  const byCountry: Record<string, number> = {};

  const allGym = await db.gymLead.findMany({ select: { country: true } });
  for (const l of allGym) {
    const c = l.country || "Unknown";
    byCountry[c] = (byCountry[c] || 0) + 1;
  }

  console.log(`\n=== FINAL COUNTS ===`);
  console.log(`Gym leads: ${totalGym}`);
  console.log(`Restaurant leads: ${totalRest}`);
  console.log(`Total: ${totalGym + totalRest}`);
  console.log(`\nGym leads by country:`);
  for (const [c, n] of Object.entries(byCountry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`);
  }
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
