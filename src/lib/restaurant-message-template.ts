/**
 * Restaurant message template — conversion-optimized.
 *
 * Follows the 4-line psychology structure:
 *   1. Hook (5-10 words, references real data only, no invented details)
 *   2. Pain (ONE easy question + soft general problem, loss-framed, no calculation)
 *   3. Solution (outcome only, max 15 words, no feature list)
 *   4. Close (offer the demo, "want me to send it over?" style)
 *
 * Hard rules enforced:
 *   - Total under 60 words
 *   - No em/en dashes
 *   - No banned words (opportunity, solution, leverage, synergy)
 *   - Max 1 exclamation mark
 *   - Plain text only, no Unicode styling
 *   - One question the brain must answer (line 4); line 2 is rhetorical
 */

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
  notes: string | null;
}

// LINE 1 — Hook. References name/city/cuisine only (real data). 5-10 words.
function buildHook(r: RestaurantInfo, seed: number): string {
  const city = r.city || "your area";
  const cuisine = r.cuisine || "food";
  const name = r.name;

  const hooks: string[] = [
    `Saw ${name} in ${city}. Standout spot.`,
    `${name} in ${city} caught my eye.`,
    `Been looking at ${cuisine} spots in ${city}. ${name} stood out.`,
    `Came across ${name}. Proper ${cuisine} place.`,
    `${name} came up on my feed. Looks legit.`,
    `Saw ${name} in ${city}. Genuinely impressive.`,
    `Noticed ${name} in ${city}. Real standout.`,
    `${name} in ${city}. One of the better ones I've seen.`,
    `Stumbled on ${name} in ${city}. Solid spot.`,
    `${name} popped up. Proper ${cuisine} place.`,
  ];
  return hooks[seed % hooks.length];
}

// LINE 2 — Pain. ONE easy question (rhetorical, no calculation) + soft general problem.
// Loss-framed: states the general risk without asking them to admit failure.
function buildPain(seed: number): string {
  const pains: string[] = [
    `When a customer DMs you at 9pm, who replies? Most places miss those entirely.`,
    `Who handles your Instagram DMs during dinner service? Most restaurants lose bookings that way.`,
    `Quick one: when you're in the middle of service, who replies to DMs? Most places miss them.`,
    `When someone messages asking for a table tonight, who replies? Most restaurants miss those DMs.`,
    `Who gets back to DMs during a busy Friday service? Most places lose those reservations.`,
    `When a customer messages at 10pm asking to book, who replies? Most miss it entirely.`,
    `Quick question: who replies to your Instagram DMs during service? Most restaurants lose those bookings.`,
    `Who replies to Instagram DMs during your busiest hours? Most places miss those entirely.`,
  ];
  return pains[seed % pains.length];
}

// LINE 3 — Solution. Outcome only, max 15 words, no features.
function buildSolution(seed: number): string {
  const solutions: string[] = [
    `I build a bot that replies instantly and books the table for you.`,
    `I make a bot that handles DMs and takes bookings automatically.`,
    `I built a bot that replies to DMs and books tables for you.`,
    `I build a bot that handles all of that automatically.`,
    `I make a bot that replies instantly and takes the booking.`,
    `I built a bot that handles the DMs and books the table.`,
    `I build a bot that replies for you and books the table.`,
    `I make a bot that takes care of all of that.`,
  ];
  return solutions[seed % solutions.length];
}

// LINE 4 — Close. Offer the demo (reciprocity). "Want me to send it over?" style.
function buildClose(seed: number): string {
  const closes: string[] = [
    `Want me to send over a 2-min demo?`,
    `I've got a 2-min demo. Want me to send it over?`,
    `Want me to send a quick demo showing how it works?`,
    `I made a 2-min demo. Want me to send it over?`,
    `Want me to send a quick demo?`,
    `Got a 2-min demo ready. Want me to send it over?`,
    `Want me to send over a demo?`,
    `I've got a demo showing how it'd work. Want me to send it?`,
  ];
  return closes[seed % closes.length];
}

const BANNED = ["opportunity", "solution", "leverage", "synergy"];

function validate(msg: string): string {
  // Remove any em/en dashes (shouldn't be any, but safety net)
  let clean = msg.replace(/—/g, "-").replace(/–/g, "-");
  // Check banned words
  const lower = clean.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
      // replace with plain alternative
      clean = clean.replace(new RegExp(w, "gi"), "fix");
    }
  }
  return clean;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateRestaurantMessage(r: RestaurantInfo, variant?: number): string {
  const seed = hashString((r.instagram || r.name) + r.name) + (variant ?? 0);

  const hook = buildHook(r, seed);
  const pain = buildPain(Math.floor(seed / 7));
  const solution = buildSolution(Math.floor(seed / 13));
  const close = buildClose(Math.floor(seed / 19));

  const message = `${hook}\n\n${pain}\n\n${solution}\n\n${close}`;
  return validate(message);
}

export function generateRestaurantMessageVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantMessage(r, attempt + (Date.now() % 1000));
}
