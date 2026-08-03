/**
 * Clears existing restaurant messages so they'll be regenerated with the
 * new template on next "Generate" click.
 *
 * Usage: bun run scripts/clear-restaurant-messages.ts
 */
import { db } from "../src/lib/db";

async function main() {
  const result = await db.restaurantLead.updateMany({
    where: { message: { not: null } },
    data: { message: null },
  });
  console.log(`Cleared ${result.count} restaurant messages. They'll regenerate with the new template.`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
