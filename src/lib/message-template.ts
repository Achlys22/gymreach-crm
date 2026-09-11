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

export const SKIP_MESSAGE = "SKIP — category unclear";

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

// LINE 1 — Hook. 8 variants per tier.
function buildHook(lead: LeadInfo, seed: number): string {
  const name = cleanName(lead.name);

  if (lead.detail && lead.detail.trim().length > 2) {
    return buildHookWithDetail(name, lead.detail.trim(), seed);
  }

  const extracted = extractDetail(lead.notes, lead.name);
  if (extracted) {
    return buildHookWithDetail(name, extracted.detail, seed);
  }

  return buildStatHook(name, seed);
}

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
    `Found ${name} while looking around. The ${d}.`,
    `${name} came up. The ${d}.`,
  ];
  return variants[Math.abs(seed) % variants.length];
}

function buildStatHook(name: string, seed: number): string {
  const variants = [
    `62% of people skip a business entirely if they can't find it in search. Wondering where ${name} shows up right now.`,
    `Most people can't find a gym in search unless it's in the top 3 results. Wondering where ${name} lands.`,
    `62% skip a business if it doesn't show up in search. Curious where ${name} ranks right now.`,
    `Only 25% of people click past the first 3 search results. Wondering where ${name} sits.`,
    `Most people search, find nothing useful, and give up. Wondering if ${name} is findable.`,
    `68% of online experiences begin with a search engine. Wondering if ${name} shows up in theirs.`,
    `75% of people never scroll past the first page of search results. Where does ${name} land?`,
    `9 out of 10 people only look at the top 3 search results. Where does ${name} rank?`,
  ];
  return variants[Math.abs(seed) % variants.length];
}

// LINE 2 — Pain. 8 variants. ONE question, never accusatory, same search phrase as line 4.
function buildPain(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead);

  const pains = [
    `Quick one: when people search "${phrase}," do you show up? Most gyms don't.`,
    `When someone searches "${phrase}," do you come up? Most gyms don't.`,
    `Quick question: if I search "${phrase}" right now, do you show up? Most don't.`,
    `When people search "${phrase}," do they find you? Most gyms don't.`,
    `Quick one: does ${cleanName(lead.name)} show up when someone searches "${phrase}"? Most gyms don't rank.`,
    `When someone Googles "${phrase}," are you on the first page? Most gyms aren't.`,
    `Quick question: do you appear in the top 3 for "${phrase}"? Most gyms don't.`,
    `When people look for "${phrase}," do they see you? Most gyms are invisible.`,
  ];
  return pains[Math.abs(seed) % pains.length];
}

// LINE 3 — Offer. 8 variants. MUST include: first month free, ~£150-300, no contract, no management fee.
function buildOffer(seed: number): string {
  const offers = [
    `I run Google Ads for martial arts gyms. First month free, you only cover ad spend (around £150-300), no contract, no management fee.`,
    `I do Google Ads for gyms. First month free, you cover ad spend only (around £150-300), no contract, no management fee.`,
    `I run Google Ads for gyms like yours. First month free, ad spend only (around £150-300), no contract, no management fee.`,
    `I handle Google Ads for martial arts gyms. First month free, you only pay ad spend (around £150-300), no contract, no management fee.`,
    `I run Google Ads for martial arts gyms. First month free, you just cover ad spend (around £150-300), no contract, no management fee.`,
    `I do Google Ads for gyms. First month free, you cover ad spend (around £150-300), no contract, no management fee.`,
    `I run Google Ads that get you ranking. First month free, you cover ad spend only (around £150-300), no contract, no management fee.`,
    `I handle Google Ads for gyms like yours. First month free, ad spend only (around £150-300), no contract, no management fee.`,
  ];
  return offers[Math.abs(seed) % offers.length];
}

// LINE 4 — Close. 8 variants. Search screenshot (NOT demo). Same search phrase as line 2.
function buildClose(lead: LeadInfo, seed: number): string {
  const phrase = searchPhrase(lead);

  const closes = [
    `Want me to send you what shows up for "${phrase}" on Google right now?`,
    `Want me to screenshot what comes up for "${phrase}" right now?`,
    `Want me to send what shows up for "${phrase}" on Google?`,
    `Want me to show you what comes up when someone searches "${phrase}"?`,
    `Want me to send a screenshot of what ranks for "${phrase}" right now?`,
    `Want me to show you what people actually see when they search "${phrase}"?`,
    `Want me to send what shows up for "${phrase}" on Google?`,
    `Want me to screenshot what's ranking for "${phrase}" right now?`,
  ];
  return closes[Math.abs(seed) % closes.length];
}

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
  // Check offer is present (rule 4 - non-negotiable)
  if (!lower.includes("first month free")) return false;
  if (!lower.includes("no contract")) return false;
  return true;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateMessage(lead: LeadInfo, variant?: number): string {
  const v = variant ?? 0;
  if (v > 10) {
    // Fallback after max retries
    return validate([
      buildHook(lead, v),
      buildPain(lead, v + 1),
      buildOffer(v + 2),
      buildClose(lead, v + 3),
    ].join("\n\n"));
  }

  const seed = hashString(lead.instagram + (lead.name || "")) + v;

  // Each line uses a DIFFERENT seed offset so they vary independently
  // 8 variants per line = 8^4 = 4096 possible combinations
  const message = [
    buildHook(lead, seed),
    buildPain(lead, seed + 100),
    buildOffer(seed + 200),
    buildClose(lead, seed + 300),
  ].join("\n\n");

  const validated = validate(message);

  if (!isValid(validated)) {
    return generateMessage(lead, v + 1);
  }

  return validated;
}

export function generateMessageVariant(lead: LeadInfo, attempt = 0): string {
  return generateMessage(lead, attempt + Math.floor(Date.now() / 1000));
}
