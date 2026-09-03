/**
 * Bootstrap — runs on every container start.
 * Imports any missing leads from db-backup.json.
 * - If a lead already exists (by instagram handle), skips it (preserves progress)
 * - If a lead doesn't exist, creates it
 *
 * This handles both fresh deploys (empty DB → imports everything) AND
 * existing deploys (adds new leads from updated backup without losing data).
 *
 * Usage: bun run scripts/bootstrap.ts
 */
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";

interface BackupGymLead {
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
  contactedAt: string | null;
  followUpAt: string | null;
}

interface BackupRestaurantLead {
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  cuisine: string | null;
  hasWebsite: boolean;
  reservationSystem: string | null;
  botDeployed: boolean;
  status: string;
  priority: string;
  notes: string | null;
  detail: string | null;
  message: string | null;
  contactedAt: string | null;
  followUpAt: string | null;
}

async function main() {
  console.log("Bootstrap: checking database...");

  if (!existsSync("db-backup.json")) {
    console.log("Bootstrap: no db-backup.json found — skipping.");
    return;
  }

  console.log("Bootstrap: loading db-backup.json...");
  const raw = JSON.parse(readFileSync("db-backup.json", "utf-8"));

  // Handle both v2 (object) and v1 (flat array) formats
  const isV2 = !Array.isArray(raw) && raw.gymLeads;
  const gymLeads: BackupGymLead[] = isV2 ? raw.gymLeads : (Array.isArray(raw) ? raw : []);
  const restaurantLeads: BackupRestaurantLead[] = isV2 ? (raw.restaurantLeads || []) : [];

  const existingGym = await db.gymLead.count();
  const existingRest = await db.restaurantLead.count();
  console.log(`Bootstrap: DB has ${existingGym} gym leads + ${existingRest} restaurant leads`);

  // --- Import gym leads (skip existing) ---
  let gymImported = 0;
  let gymSkipped = 0;
  for (const lead of gymLeads) {
    try {
      const exists = await db.gymLead.findUnique({ where: { instagram: lead.instagram } });
      if (exists) {
        gymSkipped++;
        continue;
      }
      await db.gymLead.create({
        data: {
          name: lead.name,
          instagram: lead.instagram,
          city: lead.city,
          region: lead.region,
          country: lead.country || "UK",
          disciplines: lead.disciplines,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes,
          detail: lead.detail,
          message: lead.message,
          contactedAt: lead.contactedAt ? new Date(lead.contactedAt) : null,
          followUpAt: lead.followUpAt ? new Date(lead.followUpAt) : null,
        },
      });
      gymImported++;
    } catch {
      gymSkipped++;
    }
  }

  // --- Import restaurant leads (skip existing by instagram OR name+city) ---
  let restImported = 0;
  let restSkipped = 0;
  for (const lead of restaurantLeads) {
    try {
      // Check by instagram if available
      if (lead.instagram) {
        const existsByIg = await db.restaurantLead.findFirst({
          where: { instagram: lead.instagram },
        });
        if (existsByIg) {
          restSkipped++;
          continue;
        }
      }
      // Check by name + city (for leads without instagram)
      const existsByName = await db.restaurantLead.findFirst({
        where: { name: lead.name, city: lead.city },
      });
      if (existsByName) {
        restSkipped++;
        continue;
      }

      await db.restaurantLead.create({
        data: {
          name: lead.name,
          instagram: lead.instagram,
          phone: lead.phone,
          city: lead.city,
          region: lead.region,
          country: lead.country || "UK",
          cuisine: lead.cuisine,
          hasWebsite: lead.hasWebsite ?? false,
          reservationSystem: lead.reservationSystem,
          botDeployed: lead.botDeployed ?? false,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes,
          detail: lead.detail,
          message: lead.message,
          contactedAt: lead.contactedAt ? new Date(lead.contactedAt) : null,
          followUpAt: lead.followUpAt ? new Date(lead.followUpAt) : null,
        },
      });
      restImported++;
    } catch {
      restSkipped++;
    }
  }

  console.log(`Bootstrap: gym leads — imported ${gymImported}, skipped ${gymSkipped} (already existed)`);
  console.log(`Bootstrap: restaurant leads — imported ${restImported}, skipped ${restSkipped} (already existed)`);

  const [finalGym, finalRest] = await Promise.all([db.gymLead.count(), db.restaurantLead.count()]);
  console.log(`Bootstrap: final count — ${finalGym} gym + ${finalRest} restaurant = ${finalGym + finalRest} total`);
}

main()
  .catch((e) => { console.error("Bootstrap FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
