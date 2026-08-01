/**
 * Bulk-import restaurant handles from /tmp/restaurant_handles.json
 * into the database as RestaurantLead records.
 *
 * Usage: bun run scripts/import-restaurant-handles.ts
 */
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";

interface FoundHandle {
  handle: string;
  city: string | null;
  region: string;
  cuisine: string | null;
  source: string;
  snippet: string;
  title: string;
}

function nameFromTitle(title: string, handle: string): string {
  // titles often look like "Restaurant Name (@handle)"
  const m = title.match(/^(.+?)\s*\(@/);
  if (m && m[1].trim().length > 1) return m[1].trim();
  // fallback: prettify handle
  return handle
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function inferCuisine(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("italian") || t.includes("pizza") || t.includes("pasta")) return "Italian";
  if (t.includes("indian") || t.includes("curry") || t.includes("balti")) return "Indian";
  if (t.includes("thai")) return "Thai";
  if (t.includes("japanese") || t.includes("sushi") || t.includes("ramen")) return "Japanese";
  if (t.includes("chinese") || t.includes("cantonese")) return "Chinese";
  if (t.includes("mexican") || t.includes("taco")) return "Mexican";
  if (t.includes("fine dining")) return "Fine Dining";
  if (t.includes("steak")) return "Steakhouse";
  if (t.includes("mediterranean")) return "Mediterranean";
  if (t.includes("french")) return "French";
  if (t.includes("spanish") || t.includes("tapas")) return "Spanish";
  if (t.includes("korean")) return "Korean";
  if (t.includes("vietnamese")) return "Vietnamese";
  if (t.includes("vegan") || t.includes("vegetarian")) return "Vegan/Veggie";
  if (t.includes("pub")) return "Pub";
  if (t.includes("seafood") || t.includes("fish")) return "Seafood";
  if (t.includes("brunch") || t.includes("cafe") || t.includes("coffee")) return "Cafe";
  return null;
}

async function main() {
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Import web search handles (verified, medium priority)
  if (existsSync("/tmp/restaurant_handles.json")) {
    const handles: FoundHandle[] = JSON.parse(readFileSync("/tmp/restaurant_handles.json", "utf-8"));
    console.log(`Phase 1: ${handles.length} web-search handles`);

    for (const h of handles) {
      try {
        if (h.handle) {
          const existing = await db.restaurantLead.findFirst({ where: { instagram: h.handle } });
          if (existing) { skipped++; continue; }
        }
        const name = nameFromTitle(h.title, h.handle);
        const cuisine = h.cuisine || inferCuisine(`${h.title} ${h.snippet}`);
        await db.restaurantLead.create({
          data: {
            name, instagram: h.handle, phone: null, city: h.city, region: h.region,
            cuisine, hasWebsite: false, reservationSystem: null, priority: "medium",
            notes: h.snippet ? `[Verified via web search] ${h.snippet.slice(0, 200)}` : "[Verified via web search]",
            status: "new",
          },
        });
        inserted++;
      } catch { errors++; }
    }
  }

  // 2. Import LLM handles (need verification, low priority)
  if (existsSync("/tmp/restaurant_llm_handles.json")) {
    const llmHandles: { handle: string; name: string; city: string; cuisine: string }[] =
      JSON.parse(readFileSync("/tmp/restaurant_llm_handles.json", "utf-8"));
    console.log(`Phase 2: ${llmHandles.length} LLM handles`);

    for (const h of llmHandles) {
      try {
        const existing = await db.restaurantLead.findFirst({ where: { instagram: h.handle } });
        if (existing) { skipped++; continue; }
        await db.restaurantLead.create({
          data: {
            name: h.name, instagram: h.handle, phone: null, city: h.city,
            region: h.city ? regionFor(h.city) : "UK",
            cuisine: h.cuisine || null,
            hasWebsite: false, reservationSystem: null, priority: "low",
            notes: "[LLM-suggested — verify before outreach]",
            status: "new",
          },
        });
        inserted++;
      } catch { errors++; }
    }
  }

  const total = await db.restaurantLead.count();
  console.log(`\n=== IMPORT DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total restaurant leads in DB: ${total}`);
}

function regionFor(city: string): string {
  const c = city.toLowerCase();
  if (c.includes("edinburgh") || c.includes("glasgow") || c.includes("aberdeen") || c.includes("dundee")) return "Scotland";
  if (c.includes("cardiff") || c.includes("swansea") || c.includes("newport")) return "Wales";
  if (c.includes("belfast") || c.includes("derry")) return "Northern Ireland";
  if (c.includes("london") || c.includes("shoreditch") || c.includes("soho") || c.includes("brixton")) return "London";
  if (c.includes("brighton") || c.includes("reading") || c.includes("southampton") || c.includes("bournemouth") || c.includes("oxford")) return "South East";
  if (c.includes("bristol") || c.includes("bath") || c.includes("exeter") || c.includes("plymouth")) return "South West";
  if (c.includes("birmingham") || c.includes("coventry") || c.includes("nottingham") || c.includes("leicester")) return "Midlands";
  if (c.includes("leeds") || c.includes("sheffield") || c.includes("york")) return "Yorkshire";
  if (c.includes("manchester") || c.includes("liverpool") || c.includes("chester")) return "North West";
  if (c.includes("newcastle") || c.includes("durham")) return "North East";
  return "UK";
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
