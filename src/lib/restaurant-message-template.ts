/**
 * Restaurant message template — conversion-optimized.
 *
 * Same 4-line structure. Same SKIP rule: if no specific detail is available,
 * returns "SKIP — needs manual detail" instead of filler.
 */

import { extractDetail, buildHookWithDetail } from "./detail-extractor";

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
  notes: string | null;
  detail: string | null;
}

export const SKIP_MESSAGE = "SKIP — needs manual detail";

// LINE 1 — Hook. Uses specific detail or SKIPs.
function buildHook(r: RestaurantInfo): string {
  // Priority 1: manually-set detail
  if (r.detail && r.detail.trim().length > 2) {
    return buildHookWithDetail(r.name, r.detail.trim(), "restaurant");
  }

  // Priority 2: auto-extracted detail from notes
  const extracted = extractDetail(r.notes, r.name);
  if (extracted) {
    return buildHookWithDetail(r.name, extracted.detail, "restaurant");
  }

  return SKIP_MESSAGE;
}

// LINE 2 — Pain. ONE rhetorical question + soft general problem. Loss-framed.
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

// LINE 3 — Solution. Outcome only, max 15 words.
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

// LINE 4 — Close. Offer the demo (reciprocity).
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
  let clean = msg.replace(/—/g, "-").replace(/–/g, "-");
  const lower = clean.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
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
  const hook = buildHook(r);

  if (hook === SKIP_MESSAGE) {
    return SKIP_MESSAGE;
  }

  const seed = hashString((r.instagram || r.name) + r.name) + (variant ?? 0);
  const pain = buildPain(Math.floor(seed / 7));
  const solution = buildSolution(Math.floor(seed / 13));
  const close = buildClose(Math.floor(seed / 19));

  const message = `${hook}\n\n${pain}\n\n${solution}\n\n${close}`;
  return validate(message);
}

export function generateRestaurantMessageVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantMessage(r, attempt + (Date.now() % 1000));
}

// Check if a restaurant has enough detail to generate a message
export function hasRestaurantDetail(r: RestaurantInfo): boolean {
  if (r.detail && r.detail.trim().length > 2) return true;
  const extracted = extractDetail(r.notes, r.name);
  return extracted !== null;
}
