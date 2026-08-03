/**
 * Gym message template — conversion-optimized.
 *
 * 4-line structure:
 *   1. Hook (uses specific detail OR returns "SKIP — needs manual detail")
 *   2. Pain (ONE rhetorical question + soft general problem, loss-framed)
 *   3. Solution (outcome only, max 15 words)
 *   4. Close (offer demo, "want me to send it over?" style)
 *
 * Line 1 rule: if no specific detail is available (from manual research
 * or extracted from notes), the entire message is "SKIP — needs manual detail"
 * instead of generating filler like "standout spot" or "caught my eye".
 */

import { extractDetail, buildHookWithDetail } from "./detail-extractor";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null; // manually-researched specific detail
}

export const SKIP_MESSAGE = "SKIP — needs manual detail";

function primaryDiscipline(lead: LeadInfo): string {
  const d = lead.disciplines.split(",").map((x) => x.trim()).filter(Boolean);
  if (d.length === 0) return "martial arts";
  const order = ["MMA", "Muay Thai", "Boxing", "Kickboxing", "BJJ"];
  for (const o of order) {
    if (d.includes(o)) return o;
  }
  return d[0];
}

// LINE 1 — Hook. Three tiers (all use seed so regenerate produces variety):
//   1. Manual detail (best — personalized)
//   2. Auto-extracted detail from notes (good — specific)
//   3. Honest volume opener (decent — references real data)
function buildHook(lead: LeadInfo, seed: number): string {
  // Priority 1: manually-set detail
  if (lead.detail && lead.detail.trim().length > 2) {
    return buildHookWithDetail(lead.name, lead.detail.trim(), seed);
  }

  // Priority 2: auto-extracted detail from notes
  const extracted = extractDetail(lead.notes, lead.name);
  if (extracted) {
    return buildHookWithDetail(lead.name, extracted.detail, seed);
  }

  // Priority 3: honest volume opener
  return buildVolumeHook(lead, seed);
}

// Honest volume opener — uses real data (discipline + city) without
// pretending to have researched their Instagram. Better than filler
// like "standout spot" because it's truthful.
function buildVolumeHook(lead: LeadInfo, seed: number): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "the UK";
  const name = lead.name;

  const hooks: string[] = [
    `Reaching out to ${disc} gyms in ${city}. Quick one about ${name}.`,
    `Saw ${name} listed as a ${disc} gym in ${city}. Quick question.`,
    `Reaching out — ${name}, ${disc} in ${city}.`,
    `Quick one about ${name}. ${disc} gym in ${city}, right?`,
    `Reaching out to ${disc} spots in ${city}. ${name} came up.`,
    `Saw ${name} in ${city}. ${disc} gym — quick question.`,
  ];
  const h = hashString(lead.instagram + seed);
  return hooks[Math.abs(h) % hooks.length];
}

// LINE 2 — Pain. ONE rhetorical question + soft general problem. Loss-framed.
function buildPain(lead: LeadInfo, seed: number): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "your area";

  const pains: string[] = [
    `When someone searches "${disc} gym near me", do you show up? Most gyms don't rank in the top 3.`,
    `Quick one: when people search for a ${disc} gym in ${city}, do they find you? Most don't.`,
    `Who handles your Google ranking? Most gyms don't show up when people search locally.`,
    `When someone Googles "${disc} gym ${city}", do you come up? Most gyms are buried on page 2.`,
    `Quick question: when people search for gyms in ${city}, do you show up first? Most don't.`,
    `Who's making sure you show up when people search for ${disc} locally? Most gyms are invisible.`,
    `When someone searches for a ${disc} gym near them, do you appear? Most gyms don't rank.`,
    `Quick one: if I Google "${disc} gym ${city}" right now, do you show up? Most gyms don't.`,
  ];
  return pains[seed % pains.length];
}

// LINE 3 — Solution + OFFER. This is the conversion engine.
// Does two jobs in one sentence: explains what you do AND removes the risk.
// The offer (first month free, ~£150-300, no contract) is what actually
// converts "huh, interesting" into "sure, worth a shot."
function buildSolution(seed: number): string {
  const solutions: string[] = [
    `I run Google Ads for gyms. First month free, you only cover ad spend (around £150-300), no contract.`,
    `I do Google Ads for martial arts gyms. First month free, you cover ad spend only (around £150-300), no contract.`,
    `I run Google Ads for gyms like yours. First month free, you just cover ad spend (around £150-300), no contract.`,
    `I handle Google Ads for gyms. First month free, you only pay ad spend (around £150-300), no contract.`,
    `I run Google Ads for martial arts gyms. First month free, ad spend only (around £150-300), no contract.`,
    `I do Google Ads for gyms. First month free, you cover ad spend (around £150-300), no contract.`,
    `I run Google Ads that get you ranking. First month free, you cover ad spend only (around £150-300), no contract.`,
    `I handle Google Ads for gyms like yours. First month free, ad spend only (around £150-300), no contract.`,
  ];
  return solutions[seed % solutions.length];
}

// LINE 4 — Close. Offer PROOF OF THE GAP (not a demo).
// Gym pitch is for future work (Google Ads), so we offer a search
// screenshot showing they don't rank — not a "demo" of something
// that doesn't exist yet.
function buildClose(lead: LeadInfo, seed: number): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "your area";

  const closes: string[] = [
    `Want me to send you what shows up when someone searches "${disc} gym in ${city}" right now?`,
    `Want me to screenshot what comes up when I Google "${disc} gym ${city}"? Eye-opening.`,
    `Want me to send what shows up for "${disc} gym ${city}" on Google right now?`,
    `Want me to show you what comes up when someone searches "${disc} gym in ${city}"?`,
    `Want me to send a screenshot of what ranks for "${disc} gym ${city}" right now?`,
    `Want me to show you what people actually see when they search "${disc} gym ${city}"?`,
    `Want me to send what shows up for "${disc} gym in ${city}" on Google?`,
    `Want me to screenshot what's ranking for "${disc} gym ${city}" right now?`,
  ];
  return closes[seed % closes.length];
}

const BANNED = ["opportunity", "solution", "leverage", "synergy"];

function validate(msg: string): string {
  let clean = msg.replace(/—/g, "-").replace(/–/g, "-");
  const lower = clean.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
      clean = clean.replace(new RegExp(w, "gi"), "work");
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

export function generateMessage(lead: LeadInfo, variant?: number): string {
  const seed = hashString(lead.instagram + (lead.name || "")) + (variant ?? 0);
  const hook = buildHook(lead, seed);
  const pain = buildPain(lead, Math.floor(seed / 7));
  const solution = buildSolution(Math.floor(seed / 13));
  const close = buildClose(lead, Math.floor(seed / 19));

  const message = `${hook}\n\n${pain}\n\n${solution}\n\n${close}`;
  return validate(message);
}

export function generateMessageVariant(lead: LeadInfo, attempt = 0): string {
  return generateMessage(lead, attempt + (Date.now() % 1000));
}

// Check if a lead has enough detail to generate a message
export function hasDetail(lead: LeadInfo): boolean {
  if (lead.detail && lead.detail.trim().length > 2) return true;
  const extracted = extractDetail(lead.notes, lead.name);
  return extracted !== null;
}
