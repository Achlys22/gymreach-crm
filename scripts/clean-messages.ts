/**
 * Cleans existing messages in the database — replaces em dashes (—) and
 * en dashes (–) with periods or commas so messages look human-written.
 *
 * Usage: bun run scripts/clean-messages.ts
 */
import { db } from "../src/lib/db";

async function main() {
  const leads = await db.gymLead.findMany({
    where: { message: { not: null } },
  });

  console.log(`Found ${leads.length} leads with messages`);

  let cleaned = 0;
  for (const lead of leads) {
    if (!lead.message) continue;
    const original = lead.message;
    // Replace em dash + space or space + em dash with period
    // "word — word" → "word. Word"
    let cleaned_msg = original
      .replace(/\s+—\s+/g, ". ")
      .replace(/\s+–\s+/g, ". ")
      .replace(/—/g, ". ")
      .replace(/–/g, ". ")
      // Fix double periods
      .replace(/\.\.\s+/g, ". ")
      .replace(/\.\s*\.\s*/g, ". ")
      // Capitalize after periods
      .replace(/\.\s+([a-z])/g, (_m, c) => ". " + c.toUpperCase());

    if (cleaned_msg !== original) {
      await db.gymLead.update({
        where: { id: lead.id },
        data: { message: cleaned_msg },
      });
      cleaned++;
    }
  }

  console.log(`Cleaned ${cleaned} messages (removed em/en dashes)`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
