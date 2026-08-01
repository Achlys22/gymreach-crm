/**
 * Gym message template — conversion-optimized.
 *
 * Same 4-line psychology structure as restaurants:
 *   1. Hook (5-10 words, references gym name/city/discipline)
 *   2. Pain (ONE easy question + soft general problem, loss-framed)
 *   3. Solution (outcome only, max 15 words)
 *   4. Close (offer a demo, "want me to send it over?" style)
 *
 * Gym-specific pain: not showing up when people search locally.
 * Gym-specific solution: Google Ads that put them at the top.
 */

interface LeadInfo {
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  notes: string | null;
}

function primaryDiscipline(lead: LeadInfo): string {
  const d = lead.disciplines.split(",").map((x) => x.trim()).filter(Boolean);
  if (d.length === 0) return "martial arts";
  const order = ["MMA", "Muay Thai", "Boxing", "Kickboxing", "BJJ"];
  for (const o of order) {
    if (d.includes(o)) return o;
  }
  return d[0];
}

// LINE 1 — Hook. 5-10 words, references name/city/discipline.
function buildHook(lead: LeadInfo, seed: number): string {
  const city = lead.city || "the UK";
  const disc = primaryDiscipline(lead);
  const name = lead.name;

  const hooks: string[] = [
    `Saw ${name} in ${city}. Solid ${disc} setup.`,
    `${name} in ${city} caught my eye.`,
    `Been looking at ${disc} gyms in ${city}. ${name} stood out.`,
    `Came across ${name}. Proper ${disc} gym.`,
    `${name} came up on my feed. Looks legit.`,
    `Saw ${name} in ${city}. Genuinely impressive setup.`,
    `Noticed ${name} in ${city}. Real standout gym.`,
    `${name} in ${city}. One of the better ones I've seen.`,
    `Stumbled on ${name} in ${city}. Solid ${disc} place.`,
    `${name} popped up. Proper ${disc} gym, not a cardio class.`,
  ];
  return hooks[seed % hooks.length];
}

// LINE 2 — Pain. ONE easy question + soft general problem. Loss-framed.
// Gym pain: people search locally and don't find them.
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

// LINE 3 — Solution. Outcome only, max 15 words.
function buildSolution(seed: number): string {
  const solutions: string[] = [
    `I run Google Ads that put you at the top of those searches.`,
    `I do Google Ads that get you showing up first locally.`,
    `I run Google Ads that put your gym in front of people searching.`,
    `I handle Google Ads that get you ranking at the top locally.`,
    `I run Google Ads so you show up first when people search.`,
    `I do Google Ads that put you above your competitors locally.`,
    `I run Google Ads that get you found by people searching nearby.`,
    `I handle Google Ads so you show up when people search for gyms.`,
  ];
  return solutions[seed % solutions.length];
}

// LINE 4 — Close. Offer a demo (reciprocity).
function buildClose(seed: number): string {
  const closes: string[] = [
    `Want me to send over a 2-min demo?`,
    `I've got a 2-min demo. Want me to send it over?`,
    `Want me to send a quick demo showing what I'd run for you?`,
    `I made a 2-min demo. Want me to send it over?`,
    `Want me to send a quick demo?`,
    `Got a 2-min demo ready. Want me to send it over?`,
    `Want me to send over a demo?`,
    `I've got a demo showing what ads I'd run. Want me to send it?`,
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
  const close = buildClose(Math.floor(seed / 19));

  const message = `${hook}\n\n${pain}\n\n${solution}\n\n${close}`;
  return validate(message);
}

export function generateMessageVariant(lead: LeadInfo, attempt = 0): string {
  return generateMessage(lead, attempt + (Date.now() % 1000));
}
