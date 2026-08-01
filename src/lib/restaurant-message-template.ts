/**
 * Template-based message generator for restaurant outreach.
 *
 * Generates personalized cold DMs pitching a reservation bot service to UK
 * restaurants. No external API needed. No em dashes (—) used anywhere to
 * avoid AI detection.
 */

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
  notes: string | null;
}

const HOOKS: ((r: RestaurantInfo) => string)[] = [
  (r) => `Saw ${r.name} on Instagram. Your ${r.cuisine || "food"} looks incredible.`,
  (r) => `${r.name} came up when I was looking at ${r.cuisine || "restaurants"} in ${r.city || "your area"}. The plates look unreal.`,
  (r) => `Been scrolling through ${r.cuisine || "food"} spots in ${r.city || "the UK"} and ${r.name} stood out immediately.`,
  (r) => `Quick one. Saw ${r.name}'s posts and the food genuinely looks next level.`,
  (r) => `Noticed ${r.name} in ${r.city || "your area"}. One of the best looking ${r.cuisine || "menus"} I've seen this week.`,
  (r) => `Your ${r.cuisine || "food"} keeps popping up on my feed. ${r.name} looks properly good.`,
  (r) => `Came across ${r.name} while checking out ${r.cuisine || "restaurants"} in ${r.city || "the UK"}. Seriously impressive stuff.`,
  (r) => `Saw your recent posts. ${r.name} looks like exactly the kind of place I'd want to help get more bookings for.`,
];

const OFFERS: string[] = [
  "I build reservation bots for restaurants. The bot handles customer questions (menu, prices, timings, parking, WiFi, everything) and sends reservations straight to your phone. No more missed DMs or lost bookings.",
  "I make WhatsApp/Instagram bots for restaurants. Customers message the bot, it gives them all the info they need (menu, hours, parking, prices) and books a table. You just get a text saying 'new reservation for 4 at 7pm'.",
  "Quick pitch: I build automated reservation bots for restaurants. Customer messages your IG, bot replies instantly with menu/prices/timings/parking info, takes the booking, texts it to you. Zero missed reservations.",
  "I create booking bots for restaurants. Customer DMs you, bot responds instantly with all the info (menu, prices, hours, parking, WiFi), takes the reservation, and texts you the details. No more lost DMs or missed tables.",
  "I build reservation bots that handle everything. Customer messages your Instagram, bot gives them menu/prices/timings/parking info, books the table, and sends you the reservation. You never miss a booking again.",
];

const CTAS: string[] = [
  "Want me to send a quick 2-min video showing how it'd work for your restaurant?",
  "Happy to record a 2-min demo showing the bot in action. Want me to send it over?",
  "I can send a quick 2-min demo of the bot running for a restaurant like yours. Interested?",
  "Want me to shoot a 2-min Loom showing exactly how the bot would work for you?",
  "Could send a 2-min demo video showing the bot booking a table. Shall I?",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateRestaurantMessage(r: RestaurantInfo, variant?: number): string {
  const seed = hashString((r.instagram || r.name) + r.name) + (variant ?? 0);

  const hook = HOOKS[seed % HOOKS.length](r);
  const offer = OFFERS[Math.floor(seed / 7) % OFFERS.length];
  const cta = CTAS[Math.floor(seed / 13) % CTAS.length];

  return `${hook}\n\n${offer}\n\n${cta}`;
}

export function generateRestaurantMessageVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantMessage(r, attempt + (Date.now() % 1000));
}
