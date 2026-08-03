/**
 * Gym message template — master spec compliant.
 *
 * 4-line structure, under 45 words. Google Ads pitch.
 * Category: GYM (MMA / Muay Thai / Boxing)
 *
 * Rules enforced:
 *   - Line 1: real detail OR stat-hook fallback (never filler)
 *   - Line 2: ONE easy question, never accusatory
 *   - Line 3: MUST include offer (first month free, ~£150-300, no contract)
 *   - Line 4: search screenshot close (not demo)
 *   - Line 2 + Line 4 use IDENTICAL search phrase
 *   - Name cleaned (no ®, flags, ALL CAPS)
 *   - 3 structural variants rotated for anti-pattern-detection
 *   - Post-generation validation
 */

import { extractDetail } from "./detail-extractor";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null;
}

export const SKIP_MESSAGE = "SKIP — category unclear";

// ---------------------------------------------------------------------------
// Name cleaning (Rule 2.3, 2.4)
// ---------------------------------------------------------------------------
function cleanName(name: string): string {
  let n = name.trim();
  // Strip ® ™ © symbols
  n = n.replace(/[®™©]/g, "");
  // Strip flag emoji sequences (regional indicator symbols)
  n = n.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  // Strip other emoji
  n = n.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "");
  // Fix ALL CAPS (but keep acronyms like MMA, BJJ)
  if (n === n.toUpperCase() && n.length > 4) {
    n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    // Restore known acronyms
    n = n.replace(/\bMma\b/g, "MMA").replace(/\bBjj\b/g, "BJJ");
  }
  // Collapse multiple spaces
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

// ---------------------------------------------------------------------------
// Discipline extraction
// ---------------------------------------------------------------------------
function primaryDiscipline(lead: LeadInfo): string {
  const d = lead.disciplines.split(",").map((x) => x.trim()).filter(Boolean);
  if (d.length === 0) return "martial arts";
  const order = ["MMA", "Muay Thai", "Boxing", "Kickboxing", "BJJ"];
  for (const o of order) {
    if (d.includes(o)) return o;
  }
  return d[0];
}

// ---------------------------------------------------------------------------
// Search phrase — used in BOTH Line 2 and Line 4 (Rule 3.4)
// ---------------------------------------------------------------------------
function searchPhrase(lead: LeadInfo): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "your area";
  return `${disc} gym in ${city}`;
}

// ---------------------------------------------------------------------------
// LINE 1 — Hook (Rule 2 + Rule 7)
// ---------------------------------------------------------------------------
function buildHook(lead: LeadInfo, seed: number): string {
  const name = cleanName(lead.name);
  const disc = primaryDiscipline(lead);

  // Priority 1: manual detail
  if (lead.detail && lead.detail.trim().length > 2) {
    return buildHookWithDetail(name, lead.detail.trim(), seed);
  }

  // Priority 2: auto-extracted detail from notes
  const extracted = extractDetail(lead.notes, lead.name);
  if (extracted) {
    return buildHookWithDetail(name, extracted.detail, seed);
  }

  // Priority 3: stat-hook fallback (Rule 7) — no filler, real stat
  return buildStatHook(name, seed);
}

// Hook with specific detail — NO banned filler phrases
// Banned: "standout spot," "caught my eye," "caught my attention," "impressive,"
// "looks legit," "looked great," "proper setup," "the real deal," "doing things right"
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

// Stat-hook fallback (Rule 7) — no per-lead research needed
function buildStatHook(name: string, seed: number): string {
  const variants = [
    `62% of people skip a business entirely if they can't find it in search. Wondering where ${name} shows up right now.`,
    `Most people can't find a gym in search unless it's in the top 3 results. Wondering where ${name} lands.`,
    `62% skip a business if it doesn't show up in search. Curious where ${name} ranks right now.`,
  ];
  return variants[Math.abs(seed) % variants.length];
}

// ---------------------------------------------------------------------------
// LINE 2 — Pain (Rule 3) — ONE easy question, never accusatory
// ---------------------------------------------------------------------------
function buildPain(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead);

  const pains: string[] = [
    `Quick one: when people search "${phrase}," do you show up? Most gyms don't.`,
    `When someone searches "${phrase}," do you come up? Most gyms don't.`,
    `Quick question: if I search "${phrase}" right now, do you show up? Most don't.`,
    `When people search "${phrase}," do they find you? Most gyms don't.`,
  ];
  return pains[Math.abs(seed) % pains.length];
}

// ---------------------------------------------------------------------------
// LINE 3 — Offer (Rule 4) — MUST include offer, non-negotiable
// ---------------------------------------------------------------------------
function buildOffer(seed: number): string {
  const offers: string[] = [
    `I run Google Ads for martial arts gyms. First month free, you only cover ad spend (around £150-300), no contract, no management fee.`,
    `I do Google Ads for gyms. First month free, you cover ad spend only (around £150-300), no contract, no management fee.`,
    `I run Google Ads for gyms like yours. First month free, ad spend only (around £150-300), no contract, no management fee.`,
  ];
  return offers[Math.abs(seed) % offers.length];
}

// ---------------------------------------------------------------------------
// LINE 4 — Close (Rule 5) — search screenshot, NOT demo
// ---------------------------------------------------------------------------
function buildClose(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead); // SAME phrase as Line 2

  const closes: string[] = [
    `Want me to send you what shows up for "${phrase}" on Google right now?`,
    `Want me to screenshot what comes up for "${phrase}" right now?`,
    `Want me to send what shows up for "${phrase}" on Google?`,
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
  // Strip em/en dashes
  clean = clean.replace(/—/g, "-").replace(/–/g, "-");
  // Strip any remaining ® ™ © flags
  clean = clean.replace(/[®™©]/g, "");
  clean = clean.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  return clean;
}

function isValid(msg: string): boolean {
  const lower = msg.toLowerCase();
  // Check banned filler
  for (const phrase of BANNED_FILLER) {
    if (lower.includes(phrase)) return false;
  }
  // Check 4 lines
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

export function generateMessage(lead: LeadInfo, variant?: number): string {
  const v = variant ?? 0;
  // Prevent infinite recursion
  if (v > 5) {
    // Fallback: return basic message without validation
    return validate([
      buildHook(lead, v),
      buildPain(lead, v),
      buildOffer(v),
      buildClose(lead, v),
    ].join("\n\n"));
  }

  const seed = hashString(lead.instagram + (lead.name || "")) + v;
  const variantNum = seed % 3;

  let message: string;

  if (variantNum === 0) {
    message = [
      buildHook(lead, seed),
      buildPain(lead, Math.floor(seed / 7)),
      buildOffer(Math.floor(seed / 13)),
      buildClose(lead, Math.floor(seed / 19)),
    ].join("\n\n");
  } else if (variantNum === 1) {
    message = [
      buildHook(lead, seed + 100),
      buildPain(lead, Math.floor(seed / 7) + 200),
      buildOffer(Math.floor(seed / 13) + 300),
      buildClose(lead, Math.floor(seed / 19) + 400),
    ].join("\n\n");
  } else {
    message = [
      buildHook(lead, seed + 500),
      buildPain(lead, Math.floor(seed / 7) + 600),
      buildOffer(Math.floor(seed / 13) + 700),
      buildClose(lead, Math.floor(seed / 19) + 800),
    ].join("\n\n");
  }

  message = validate(message);

  if (!isValid(message)) {
    return generateMessage(lead, v + 1);
  }

  return message;
}

export function generateMessageVariant(lead: LeadInfo, attempt = 0): string {
  return generateMessage(lead, attempt + (Date.now() % 1000));
}
