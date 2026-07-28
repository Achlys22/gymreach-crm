/**
 * Bulk-import ALL handles (hunter + LLM) into the database.
 * - Hunter handles: verified from real web search results (high confidence)
 * - LLM handles: recalled from LLM training data (need verification)
 * Skips duplicates. Marks source in notes.
 *
 * Usage:  bun run scripts/import-handles.ts
 */
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";
import { SEED_LEADS } from "../src/lib/seed-data";

interface HunterHandle {
  handle: string;
  city: string | null;
  region: string;
  discipline: string | null;
  source: string;
  snippet: string;
  title: string;
}

interface LlmHandle {
  handle: string;
  name: string;
  city: string;
  region: string;
  discipline: string;
}

function nameFromTitle(title: string, handle: string): string {
  const m = title.match(/^(.+?)\s*\(@/);
  if (m && m[1].trim().length > 1) return m[1].trim();
  return handle
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function inferDisciplines(text: string): string[] {
  const set = new Set<string>();
  const t = text.toLowerCase();
  if (t.includes("mma")) set.add("MMA");
  if (t.includes("muay thai") || t.includes("muaythai")) set.add("Muay Thai");
  if (t.includes("boxing")) set.add("Boxing");
  if (t.includes("kickboxing")) set.add("Kickboxing");
  if (t.includes("bjj") || t.includes("jiu jitsu") || t.includes("jiu-jitsu")) set.add("BJJ");
  if (t.includes("wrestling")) set.add("Wrestling");
  return [...set];
}

// Map LLM region strings to our region constants
function mapRegion(r: string): string {
  const lower = r.toLowerCase();
  if (lower.includes("london")) return "London";
  if (lower.includes("north west") || lower.includes("manchester") || lower.includes("liverpool") || lower.includes("merseyside")) return "North West";
  if (lower.includes("midlands") || lower.includes("birmingham")) return "Midlands";
  if (lower.includes("yorkshire") || lower.includes("leeds") || lower.includes("sheffield")) return "Yorkshire";
  if (lower.includes("north east") || lower.includes("newcastle")) return "North East";
  if (lower.includes("south west") || lower.includes("bristol")) return "South West";
  if (lower.includes("south east") || lower.includes("brighton")) return "South East";
  if (lower.includes("scotland")) return "Scotland";
  if (lower.includes("wales")) return "Wales";
  if (lower.includes("northern ireland") || lower.includes("belfast")) return "Northern Ireland";
  if (lower.includes("ireland") && !lower.includes("northern")) return "Ireland";
  return "UK";
}

async function main() {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Seed leads (verified, 38)
  for (const seed of SEED_LEADS) {
    const exists = await db.gymLead.findUnique({ where: { instagram: seed.instagram } });
    if (exists) { skipped++; continue; }
    await db.gymLead.create({
      data: {
        name: seed.name, instagram: seed.instagram,
        city: seed.city || null, region: seed.region,
        disciplines: seed.disciplines,
        notes: seed.notes || null,
        status: "new", priority: "medium",
      },
    });
    inserted++;
  }

  // 2. Hunter handles (verified via web search)
  if (existsSync("/tmp/gym_handles.json")) {
    const hunter: HunterHandle[] = JSON.parse(readFileSync("/tmp/gym_handles.json", "utf-8"));
    for (const h of hunter) {
      try {
        const exists = await db.gymLead.findUnique({ where: { instagram: h.handle } });
        if (exists) { skipped++; continue; }
        const name = nameFromTitle(h.title, h.handle);
        const disc = new Set<string>();
        if (h.discipline) disc.add(h.discipline);
        for (const d of inferDisciplines(`${h.title} ${h.snippet}`)) disc.add(d);
        await db.gymLead.create({
          data: {
            name, instagram: h.handle,
            city: h.city || null, region: h.region || "UK",
            disciplines: [...disc].join(",") || "MMA",
            notes: `[Verified via web search] ${h.snippet.slice(0, 200)}`,
            status: "new", priority: "medium",
          },
        });
        inserted++;
      } catch { errors++; }
    }
  }

  // 3. LLM handles (need verification)
  if (existsSync("/tmp/llm_handles.json")) {
    const llm: LlmHandle[] = JSON.parse(readFileSync("/tmp/llm_handles.json", "utf-8"));
    for (const h of llm) {
      try {
        const exists = await db.gymLead.findUnique({ where: { instagram: h.handle } });
        if (exists) { skipped++; continue; }
        const disc = h.discipline || "MMA";
        await db.gymLead.create({
          data: {
            name: h.name, instagram: h.handle,
            city: h.city || null, region: mapRegion(h.region),
            disciplines: disc,
            notes: `[LLM-suggested — verify before outreach]`,
            status: "new", priority: "low",
          },
        });
        inserted++;
      } catch { errors++; }
    }
  }

  const total = await db.gymLead.count();
  console.log(`\n=== IMPORT DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB: ${total}`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
