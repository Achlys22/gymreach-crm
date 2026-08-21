/**
 * Import universal-leads.json into the GymReach CRM database.
 *
 * Reads /tmp/universal-leads.json (output from universal-hunter.ts)
 * and inserts leads into either the GymLead or RestaurantLead table
 * based on the niche.
 *
 * Usage:
 *   bun run scripts/import-universal.ts --workspace gym
 *   bun run scripts/import-universal.ts --workspace restaurant
 *
 * Requirements:
 *   - Run from the gymreach-crm project directory
 *   - Prisma + database must be set up (bun run db:push)
 *   - /tmp/universal-leads.json must exist (run universal-hunter first)
 */

import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";

interface UniversalLead {
  name: string;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  niche: string;
  source: string;
  snippet: string;
  url: string;
}

function regionFor(city: string | null, country: string): string {
  if (!city) return country;
  const c = city.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => c.includes(k));

  if (country === "UK" || country === "United Kingdom") {
    if (has("london", "brighton", "southampton", "bournemouth", "oxford")) return "South East";
    if (has("bristol", "bath", "exeter", "plymouth")) return "South West";
    if (has("birmingham", "coventry", "nottingham", "leicester")) return "Midlands";
    if (has("leeds", "sheffield", "york", "bradford")) return "Yorkshire";
    if (has("manchester", "liverpool", "chester", "preston")) return "North West";
    if (has("newcastle", "durham", "sunderland")) return "North East";
    if (has("edinburgh", "glasgow", "aberdeen", "dundee")) return "Scotland";
    if (has("cardiff", "swansea", "newport")) return "Wales";
    if (has("belfast", "derry")) return "Northern Ireland";
  }

  return country;
}

async function importToGym(leads: UniversalLead[]) {
  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (!lead.instagram) {
      skipped++;
      continue;
    }

    try {
      const existing = await db.gymLead.findUnique({
        where: { instagram: lead.instagram },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await db.gymLead.create({
        data: {
          name: lead.name,
          instagram: lead.instagram,
          city: lead.city,
          region: regionFor(lead.city, lead.country),
          disciplines: lead.niche.includes("mma") ? "MMA" :
                       lead.niche.includes("muay") ? "Muay Thai" :
                       lead.niche.includes("boxing") ? "Boxing" :
                       lead.niche.includes("bjj") || lead.niche.includes("jiu") ? "BJJ" :
                       lead.niche.includes("kickboxing") ? "Kickboxing" : "MMA",
          priority: "low",
          notes: `[Imported via universal hunter] ${lead.snippet.slice(0, 200)}`,
          status: "new",
        },
      });
      inserted++;
    } catch {
      skipped++;
    }
  }

  return { inserted, skipped };
}

async function importToRestaurant(leads: UniversalLead[]) {
  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    try {
      // Check by instagram if available
      if (lead.instagram) {
        const existing = await db.restaurantLead.findFirst({
          where: { instagram: lead.instagram },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Check by name + city
      const existingByName = await db.restaurantLead.findFirst({
        where: { name: lead.name, city: lead.city },
      });
      if (existingByName) {
        skipped++;
        continue;
      }

      await db.restaurantLead.create({
        data: {
          name: lead.name,
          instagram: lead.instagram,
          phone: lead.phone,
          city: lead.city,
          region: regionFor(lead.city, lead.country),
          cuisine: null,
          hasWebsite: false,
          reservationSystem: null,
          priority: "low",
          notes: `[Imported via universal hunter] ${lead.snippet.slice(0, 200)}`,
          status: "new",
        },
      });
      inserted++;
    } catch {
      skipped++;
    }
  }

  return { inserted, skipped };
}

async function main() {
  const workspace = process.argv.includes("--workspace restaurant") ? "restaurant" : "gym";

  if (!existsSync("/tmp/universal-leads.json")) {
    console.error("No /tmp/universal-leads.json found.");
    console.error("Run the universal hunter first:");
    console.error("  bun run scripts/universal-hunter.ts --config scripts/hunter-configs/dentists-uk.json");
    process.exit(1);
  }

  const leads: UniversalLead[] = JSON.parse(readFileSync("/tmp/universal-leads.json", "utf-8"));
  console.log(`Loaded ${leads.length} leads from universal hunter`);
  console.log(`Importing to: ${workspace} workspace`);

  const result = workspace === "restaurant"
    ? await importToRestaurant(leads)
    : await importToGym(leads);

  const total = workspace === "restaurant"
    ? await db.restaurantLead.count()
    : await db.gymLead.count();

  console.log(`\n=== IMPORT DONE ===`);
  console.log(`Inserted: ${result.inserted}`);
  console.log(`Skipped (duplicates): ${result.skipped}`);
  console.log(`Total ${workspace} leads in DB: ${total}`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
