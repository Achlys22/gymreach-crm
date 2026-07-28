/**
 * Exports all leads from the database to db-backup.json.
 * This file is committed to git and used by bootstrap.ts to seed
 * the production database on first deploy.
 *
 * Usage: bun run scripts/export-db.ts
 */
import { db } from "../src/lib/db";
import { writeFileSync } from "fs";

async function main() {
  const leads = await db.gymLead.findMany({
    orderBy: { createdAt: "asc" },
  });

  const exportData = leads.map((l) => ({
    name: l.name,
    instagram: l.instagram,
    city: l.city,
    region: l.region,
    disciplines: l.disciplines,
    status: l.status,
    priority: l.priority,
    notes: l.notes,
    contactedAt: l.contactedAt?.toISOString() ?? null,
    followUpAt: l.followUpAt?.toISOString() ?? null,
  }));

  writeFileSync("db-backup.json", JSON.stringify(exportData, null, 2));
  console.log(`Exported ${exportData.length} leads to db-backup.json`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
