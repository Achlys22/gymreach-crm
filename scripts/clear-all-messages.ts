/**
 * Clears existing messages (gym + restaurant) so they regenerate
 * with the new 4-line psychology template on next "Generate" click.
 *
 * Usage: bun run scripts/clear-all-messages.ts
 */
import { db } from "../src/lib/db";

async function main() {
  const gymResult = await db.gymLead.updateMany({
    where: { message: { not: null } },
    data: { message: null },
  });
  const restResult = await db.restaurantLead.updateMany({
    where: { message: { not: null } },
    data: { message: null },
  });
  console.log(`Cleared ${gymResult.count} gym messages + ${restResult.count} restaurant messages.`);
  console.log("They'll regenerate with the new 4-line template.");
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
