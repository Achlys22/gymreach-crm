/**
 * Template-based message generator for restaurant outreach.
 *
 * Generates personalized cold DMs pitching a reservation bot service to UK
 * restaurants. No external API needed. No em dashes (—) used anywhere to
 * avoid AI detection.
 *
 * Structure (Problem-Agitate-Solve):
 *   1. Hook (personal, references their food/restaurant, no ambiguity)
 *   2. Pain point (missed DMs = lost reservations)
 *   3. Solution (one line, no feature dump)
 *   4. CTA (offer to send a demo)
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
  (r) => `Saw your posts. The food at ${r.name} looks incredible.`,
  (r) => `Been scrolling through ${r.city || "your area"} restaurants and ${r.name} stood out immediately. The dishes look unreal.`,
  (r) => `${r.name} came up on my feed. Genuinely some of the best looking food I've seen this week.`,
  (r) => `Quick one. Saw ${r.name}'s posts and the food looks next level.`,
  (r) => `Noticed ${r.name} in ${r.city || "your area"}. The plates you're putting out look properly good.`,
  (r) => `Your food keeps popping up on my feed. ${r.name} looks like exactly the kind of place I'd want to help get more bookings for.`,
  (r) => `Came across ${r.name} while checking out ${r.city || "restaurants"} in your area. Seriously impressive food.`,
  (r) => `Saw your recent posts. ${r.name} looks like a proper restaurant, not just an Instagram account.`,
];

const PAINS: string[] = [
  "Quick question: when a customer DMs you at 9pm asking to book a table, who replies? Most restaurants miss those DMs and lose the reservation.",
  "Quick question: when someone messages your Instagram asking about a table, how long does it take you to reply? Most restaurants lose those bookings because they can't respond fast enough.",
  "Quick question: how many DMs asking about bookings do you think you've missed this week? Most restaurants are losing reservations every day because they can't reply fast enough.",
  "Quick question: when you're busy on a Friday night service, who's replying to the Instagram DMs asking about table availability? Most restaurants miss them and lose the booking.",
];

const SOLUTIONS: string[] = [
  "I build a bot that replies instantly and books the table for them. You just get a text with the reservation details.",
  "I make a bot that handles all the DMs and takes the booking automatically. You just get a text with the details.",
  "I build a bot that replies to customer DMs instantly and books tables for you. You just get a text saying 'new reservation'.",
  "I create a bot that answers customer questions and takes reservations automatically. You just get a text with the booking.",
];

const CTAS: string[] = [
  "Want me to send a quick 2-min demo showing how it'd work for your restaurant?",
  "Happy to send a 2-min demo showing the bot in action. Want me to send it over?",
  "I can send a quick 2-min demo of the bot running for a restaurant like yours. Interested?",
  "Want me to shoot a 2-min demo showing exactly how it'd work for you?",
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
  const pain = PAINS[Math.floor(seed / 7) % PAINS.length];
  const solution = SOLUTIONS[Math.floor(seed / 13) % SOLUTIONS.length];
  const cta = CTAS[Math.floor(seed / 19) % CTAS.length];

  return `${hook}\n\n${pain}\n\n${solution}\n\n${cta}`;
}

export function generateRestaurantMessageVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantMessage(r, attempt + (Date.now() % 1000));
}
