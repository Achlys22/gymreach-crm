/**
 * Exports ALL leads (gym + restaurant) from the database to db-backup.json.
 * This file is committed to git and used by bootstrap.ts to seed the
 * production database on deploy.
 *
 * Usage: bun run scripts/export-db.ts
 */
import { db } from "../src/lib/db";
import { writeFileSync } from "fs";

async function main() {
  const gymLeads = await db.gymLead.findMany({ orderBy: { createdAt: "asc" } });
  const restaurantLeads = await db.restaurantLead.findMany({ orderBy: { createdAt: "asc" } });

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    gymLeads: gymLeads.map((l) => ({
      name: l.name,
      instagram: l.instagram,
      city: l.city,
      region: l.region,
      country: l.country,
      disciplines: l.disciplines,
      status: l.status,
      priority: l.priority,
      notes: l.notes,
      detail: l.detail,
      message: l.message,
      contactedAt: l.contactedAt?.toISOString() ?? null,
      followUpAt: l.followUpAt?.toISOString() ?? null,
    })),
    restaurantLeads: restaurantLeads.map((l) => ({
      name: l.name,
      instagram: l.instagram,
      phone: l.phone,
      city: l.city,
      region: l.region,
      country: l.country,
      cuisine: l.cuisine,
      hasWebsite: l.hasWebsite,
      reservationSystem: l.reservationSystem,
      botDeployed: l.botDeployed,
      status: l.status,
      priority: l.priority,
      notes: l.notes,
      detail: l.detail,
      message: l.message,
      contactedAt: l.contactedAt?.toISOString() ?? null,
      followUpAt: l.followUpAt?.toISOString() ?? null,
    })),
  };

  writeFileSync("db-backup.json", JSON.stringify(exportData, null, 2));
  console.log(`Exported ${exportData.gymLeads.length} gym leads + ${exportData.restaurantLeads.length} restaurant leads to db-backup.json`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
