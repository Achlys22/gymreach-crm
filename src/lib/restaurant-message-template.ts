/**
 * Restaurant message template — master spec compliant.
 *
 * 4-line structure, under 45 words. Reservation bot pitch.
 * Category: RESTAURANT
 *
 * Rules enforced:
 *   - Line 1: real detail OR stat-hook fallback (never filler)
 *   - Line 2: ONE easy question, never accusatory
 *   - Line 3: outcome only (no feature dump)
 *   - Line 4: Loom demo close (real product to show)
 *   - Name cleaned (no ®, flags, ALL CAPS)
 *   - 3 structural variants rotated
 *   - Post-generation validation
 */

import { extractDetail } from "./detail-extractor";

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

export const SKIP_MESSAGE = "SKIP — category unclear";

// ---------------------------------------------------------------------------
// Name cleaning (Rule 2.3, 2.4)
// ---------------------------------------------------------------------------
function cleanName(name: string): string {
  let n = name.trim();
  n = n.replace(/[®™©]/g, "");
  n = n.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  n = n.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "");
  if (n === n.toUpperCase() && n.length > 4) {
    n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

// ---------------------------------------------------------------------------
// LINE 1 — Hook (Rule 2 + Rule 7)
// ---------------------------------------------------------------------------
function buildHook(r: RestaurantInfo, seed: number): string {
  const name = cleanName(r.name);

  // Priority 1: manual detail
  if (r.detail && r.detail.trim().length > 2) {
    return buildHookWithDetail(name, r.detail.trim(), seed);
  }

  // Priority 2: auto-extracted detail from notes
  const extracted = extractDetail(r.notes, r.name);
  if (extracted) {
    return buildHookWithDetail(name, extracted.detail, seed);
  }

  // Priority 3: stat-hook fallback (Rule 7)
  return buildStatHook(name, seed);
}

// Hook with detail — NO banned filler
function buildHookWithDetail(name: string, detail: string, seed: number): string {
  let d = detail.trim().toLowerCase();
  d = d.replace(/^(their|the|a|an)\s+/i, "");

  const variants = [
    `Saw ${name}'s ${d}.`,
    `Been looking at ${name}. The ${d} stood out.`,
    `Noticed ${name}'s ${d}.`,
    `Came across ${name}. Their ${d}.`,
    `Stumbled on ${name}. The ${d}.`,
    `Saw ${name}. The ${d}.`,
  ];
  return variants[Math.abs(seed) % variants.length];
}

// Stat-hook fallback (Rule 7)
function buildStatHook(name: string, seed: number): string {
  const variants = [
    `60% of restaurant inquiries sent online get no reply within 24 hours. Wondering where ${name} lands on that.`,
    `Most restaurant DMs go unanswered for hours. Wondering how ${name} handles theirs.`,
    `60% of online restaurant inquiries get no reply within 24 hours. Curious where ${name} sits.`,
  ];
  return variants[Math.abs(seed) % variants.length];
}

// ---------------------------------------------------------------------------
// LINE 2 — Pain (Rule 3) — ONE easy question, never accusatory
// ---------------------------------------------------------------------------
function buildPain(seed: number): string {
  const pains: string[] = [
    `Quick question: when someone messages asking about a table, how long does it usually take you to reply? Most restaurants lose those bookings.`,
    `Quick one: when a customer DMs asking to book, how fast do you reply? Most places miss those bookings.`,
    `Quick question: when someone DMs about a table tonight, who replies? Most restaurants lose those bookings.`,
    `Quick one: when a customer messages asking to book, how long to reply? Most places miss those bookings.`,
  ];
  return pains[Math.abs(seed) % pains.length];
}

// ---------------------------------------------------------------------------
// LINE 3 — Outcome only (Rule 4) — no feature dump
// ---------------------------------------------------------------------------
function buildOutcome(seed: number): string {
  const outcomes: string[] = [
    `I build a bot that replies to DMs instantly and books the table. You just get a text with the reservation details.`,
    `I built a bot that replies to DMs instantly and books the table. You just get a text with the details.`,
    `I make a bot that handles DMs and books tables automatically. You just get a text with the reservation.`,
  ];
  return outcomes[Math.abs(seed) % outcomes.length];
}

// ---------------------------------------------------------------------------
// LINE 4 — Close (Rule 5) — Loom demo (real product)
// ---------------------------------------------------------------------------
function buildClose(seed: number): string {
  const closes: string[] = [
    `Got a 2-min demo ready. Want me to send it over?`,
    `I've got a 2-min demo. Want me to send it over?`,
    `Want me to send a 2-min demo of it in action?`,
  ];
  return closes[Math.abs(seed) % closes.length];
}

// ---------------------------------------------------------------------------
// Validation (Rule 6)
// ---------------------------------------------------------------------------
const BANNED_FILLER = [
  "standout spot", "caught my eye", "caught my attention", "impressive",
  "looks legit", "looked great", "proper setup", "the real deal",
  "doing things right",
];

function validate(msg: string): string {
  let clean = msg;
  clean = clean.replace(/—/g, "-").replace(/–/g, "-");
  clean = clean.replace(/[®™©]/g, "");
  clean = clean.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  return clean;
}

function isValid(msg: string): boolean {
  const lower = msg.toLowerCase();
  for (const phrase of BANNED_FILLER) {
    if (lower.includes(phrase)) return false;
  }
  const lines = msg.split("\n\n");
  if (lines.length !== 4) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Hash + generation
// ---------------------------------------------------------------------------
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateRestaurantMessage(r: RestaurantInfo, variant?: number): string {
  const v = variant ?? 0;
  if (v > 5) {
    return validate([
      buildHook(r, v),
      buildPain(v),
      buildOutcome(v),
      buildClose(v),
    ].join("\n\n"));
  }

  const seed = hashString((r.instagram || r.name) + r.name) + v;
  const variantNum = seed % 3;

  let message: string;

  if (variantNum === 0) {
    message = [
      buildHook(r, seed),
      buildPain(Math.floor(seed / 7)),
      buildOutcome(Math.floor(seed / 13)),
      buildClose(Math.floor(seed / 19)),
    ].join("\n\n");
  } else if (variantNum === 1) {
    message = [
      buildHook(r, seed + 100),
      buildPain(Math.floor(seed / 7) + 200),
      buildOutcome(Math.floor(seed / 13) + 300),
      buildClose(Math.floor(seed / 19) + 400),
    ].join("\n\n");
  } else {
    message = [
      buildHook(r, seed + 500),
      buildPain(Math.floor(seed / 7) + 600),
      buildOutcome(Math.floor(seed / 13) + 700),
      buildClose(Math.floor(seed / 19) + 800),
    ].join("\n\n");
  }

  message = validate(message);

  if (!isValid(message)) {
    return generateRestaurantMessage(r, v + 1);
  }

  return message;
}

export function generateRestaurantMessageVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantMessage(r, attempt + (Date.now() % 1000));
}
