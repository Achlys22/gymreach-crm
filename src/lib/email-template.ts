/**
 * Gym email message template — follows master spec rules.
 *
 * Email structure (longer than DM but still concise):
 *   Subject line: specific + curiosity-inducing
 *   Body: 4 short paragraphs (hook, pain, offer, close)
 *
 * Rules enforced:
 *   - No banned filler phrases
 *   - Offer always included (first month free, ~£150-300, no contract)
 *   - Name cleaned (no ®, flags, ALL CAPS)
 *   - Post-generation validation
 *   - Structural variants for anti-pattern-detection
 */

import { extractDetail } from "./detail-extractor";

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  country: string | null;
  disciplines: string;
  notes: string | null;
  detail: string | null;
}

function cleanName(name: string): string {
  let n = name.trim();
  n = n.replace(/[®™©]/g, "");
  n = n.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  n = n.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "");
  if (n === n.toUpperCase() && n.length > 4) {
    n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    n = n.replace(/\bMma\b/g, "MMA").replace(/\bBjj\b/g, "BJJ");
  }
  return n.replace(/\s+/g, " ").trim();
}

function primaryDiscipline(lead: LeadInfo): string {
  const d = lead.disciplines.split(",").map((x) => x.trim()).filter(Boolean);
  if (d.length === 0) return "martial arts";
  const order = ["MMA", "Muay Thai", "Boxing", "Kickboxing", "BJJ"];
  for (const o of order) if (d.includes(o)) return o;
  return d[0];
}

function searchPhrase(lead: LeadInfo): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "your area";
  return `${disc} gym in ${city}`;
}

// --- Subject lines ---
function buildSubject(lead: LeadInfo, seed: number): string {
  const name = cleanName(lead.name);
  const disc = primaryDiscipline(lead);
  const subjects = [
    `Quick question about ${name}'s Google ranking`,
    `${name} — showing up in ${disc} searches?`,
    `Found ${name} online — quick question`,
    `${disc} in ${lead.city || "your area"}: ${name} visibility`,
    `Question about ${name}'s search presence`,
  ];
  return subjects[Math.abs(seed) % subjects.length];
}

// --- Body paragraphs ---
function buildHook(lead: LeadInfo, seed: number): string {
  const name = cleanName(lead.name);

  if (lead.detail && lead.detail.trim().length > 2) {
    let d = lead.detail.trim().toLowerCase();
    d = d.replace(/^(their|the|a|an)\s+/i, "");
    const variants = [
      `I came across ${name} while researching ${primaryDiscipline(lead)} gyms in your area. The ${d} caught my attention.`,
      `I was looking at ${primaryDiscipline(lead)} gyms in ${lead.city || "your area"} and ${name}'s ${d} stood out.`,
      `Noticed ${name} while checking out ${primaryDiscipline(lead)} gyms. The ${d} is impressive.`,
    ];
    return variants[Math.abs(seed) % variants.length];
  }

  const extracted = extractDetail(lead.notes, lead.name);
  if (extracted) {
    let d = extracted.detail;
    const variants = [
      `I came across ${name} while researching ${primaryDiscipline(lead)} gyms. The ${d} caught my attention.`,
      `I was looking at ${primaryDiscipline(lead)} gyms in ${lead.city || "your area"} and ${name}'s ${d} stood out.`,
      `Noticed ${name} while checking out ${primaryDiscipline(lead)} gyms. The ${d} is impressive.`,
    ];
    return variants[Math.abs(seed) % variants.length];
  }

  // Stat-hook fallback
  return `62% of people skip a business entirely if they can't find it in search. I was checking where ${name} shows up right now.`;
}

function buildPain(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead);
  const pains = [
    `When someone searches "${phrase}" on Google, do you show up in the top 3? Most gyms don't rank there, and that's where 75% of clicks go.`,
    `Quick question: if I search "${phrase}" right now, does ${cleanName(lead.name)} appear on the first page? Most gyms are buried on page 2 or lower.`,
    `I checked the search results for "${phrase}" and noticed most gyms in your area aren't showing up where potential members are looking.`,
  ];
  return pains[Math.abs(seed) % pains.length];
}

function buildOffer(seed: number): string {
  const offers = [
    `I run Google Ads for martial arts gyms. I'd like to run your first month free — you only cover the ad spend (around £150-300), no management fee, no contract. If it doesn't bring you more members, we part ways, no hard feelings.`,
    `I do Google Ads for gyms like yours. First month is on me — you just cover ad spend (around £150-300), no contract, no management fee. One-month test to see if we can get you showing up when people search locally.`,
    `I run Google Ads specifically for martial arts gyms. Happy to run your first month free — you cover the ad spend only (around £150-300), no contract, no management fee. Simple one-month test.`,
  ];
  return offers[Math.abs(seed) % offers.length];
}

function buildClose(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead);
  const closes = [
    `Want me to send you a screenshot of what shows up for "${phrase}" right now? It's eye-opening.`,
    `I can send you a quick screenshot of what comes up when someone searches "${phrase}". Want me to send it over?`,
    `Want me to screenshot what's currently ranking for "${phrase}"? Takes 30 seconds and shows exactly where you stand.`,
  ];
  return closes[Math.abs(seed) % closes.length];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function validate(msg: string): string {
  return msg.replace(/—/g, "-").replace(/–/g, "-").replace(/[®™©]/g, "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
}

export function generateGymEmail(lead: LeadInfo, variant?: number): string {
  const seed = hashString(lead.instagram + (lead.name || "")) + (variant ?? 0);

  const subject = buildSubject(lead, seed);
  const hook = buildHook(lead, seed);
  const pain = buildPain(lead, Math.floor(seed / 7));
  const offer = buildOffer(Math.floor(seed / 13));
  const close = buildClose(lead, Math.floor(seed / 19));

  const body = `${hook}\n\n${pain}\n\n${offer}\n\n${close}\n\n— [Your name]`;

  return validate(`SUBJECT: ${subject}\n\n${body}`);
}

export function generateGymEmailVariant(lead: LeadInfo, attempt = 0): string {
  return generateGymEmail(lead, attempt + (Date.now() % 1000));
}
