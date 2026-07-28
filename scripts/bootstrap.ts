/**
 * Bootstrap — runs on every container start.
 * If the database is empty, imports all leads from db-backup.json.
 * If the database already has leads, skips (idempotent — preserves
 * any outreach progress you've made).
 *
 * Usage: bun run scripts/bootstrap.ts
 */
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "fs";

interface BackupLead {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  status: string;
  priority: string;
  notes: string | null;
  contactedAt: string | null;
  followUpAt: string | null;
}

async function main() {
  // Ensure schema exists
  console.log("Bootstrap: checking database...");

  const existing = await db.gymLead.count();

  if (existing > 0) {
    console.log(`Bootstrap: database already has ${existing} leads — skipping import.`);
    return;
  }

  if (!existsSync("db-backup.json")) {
    console.log("Bootstrap: no db-backup.json found — starting with empty database.");
    return;
  }

  console.log("Bootstrap: database is empty — importing leads from db-backup.json...");
  const data: BackupLead[] = JSON.parse(readFileSync("db-backup.json", "utf-8"));

  let imported = 0;
  for (const lead of data) {
    try {
      await db.gymLead.create({
        data: {
          name: lead.name,
          instagram: lead.instagram,
          city: lead.city,
          region: lead.region,
          disciplines: lead.disciplines,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes,
          contactedAt: lead.contactedAt ? new Date(lead.contactedAt) : null,
          followUpAt: lead.followUpAt ? new Date(lead.followUpAt) : null,
        },
      });
      imported++;
    } catch (e) {
      // skip duplicates / errors
    }
  }

  console.log(`Bootstrap: imported ${imported} of ${data.length} leads.`);
}

main()
  .catch((e) => { console.error("Bootstrap FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
