/**
 * Restaurant email message template — follows master spec rules.
 *
 * Email structure:
 *   Subject line: specific + curiosity-inducing
 *   Body: 4 short paragraphs (hook, pain, outcome, close)
 */

import { extractDetail } from "./detail-extractor";

interface RestaurantInfo {
  name: string;
  instagram: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  cuisine: string | null;
  reservationSystem: string | null;
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
  }
  return n.replace(/\s+/g, " ").trim();
}

function buildSubject(r: RestaurantInfo, seed: number): string {
  const name = cleanName(r.name);
  const subjects = [
    `Quick question about ${name}'s Instagram DMs`,
    `${name} — missing reservations from Instagram?`,
    `Found ${name} online — quick question`,
    `Question about ${name}'s booking process`,
    `Are you losing reservations from Instagram DMs?`,
  ];
  return subjects[Math.abs(seed) % subjects.length];
}

function buildHook(r: RestaurantInfo, seed: number): string {
  const name = cleanName(r.name);
  const cuisine = r.cuisine || "restaurant";

  if (r.detail && r.detail.trim().length > 2) {
    let d = r.detail.trim().toLowerCase();
    d = d.replace(/^(their|the|a|an)\s+/i, "");
    return `I came across ${name} while looking at ${cuisine} restaurants in ${r.city || "your area"}. The ${d} caught my eye.`;
  }

  const extracted = extractDetail(r.notes, r.name);
  if (extracted) {
    return `I was looking at ${cuisine} restaurants in ${r.city || "your area"} and ${name}'s ${extracted.detail} stood out.`;
  }

  return `60% of restaurant inquiries sent online get no reply within 24 hours. I was wondering how ${name} handles theirs.`;
}

function buildPain(seed: number): string {
  const pains = [
    `When a customer DMs you at 9pm asking to book a table, who replies? Most restaurants miss those messages entirely — and those are paying customers who go somewhere else.`,
    `Quick question: when someone messages your Instagram asking about availability, how long does it take you to reply? Most restaurants lose those bookings because they can't respond fast enough.`,
    `I've been looking at how restaurants handle Instagram DMs. Most miss bookings because they can't reply during service hours — and those customers don't come back.`,
  ];
  return pains[Math.abs(seed) % pains.length];
}

function buildOutcome(seed: number): string {
  const outcomes = [
    `I build a bot that replies to Instagram DMs instantly and books the table for you. It answers questions about menu, prices, timings — everything. You just get a text with the reservation details.`,
    `I created a bot that handles all Instagram DMs automatically. It replies instantly with your menu, prices, hours, and takes the booking. You just get a text saying "new reservation for 4 at 7pm."`,
    `I build reservation bots for restaurants. The bot replies to DMs instantly, answers customer questions, and books the table. You just get a text with the details.`,
  ];
  return outcomes[Math.abs(seed) % outcomes.length];
}

function buildClose(seed: number): string {
  const closes = [
    `I've got a 2-minute demo showing exactly how it works. Want me to send it over?`,
    `Want me to send you a quick demo? It takes 2 minutes to watch and shows the bot in action.`,
    `I can send over a demo video showing how it'd work for ${"your restaurant"}. Want me to send it?`,
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

export function generateRestaurantEmail(r: RestaurantInfo, variant?: number): string {
  const seed = hashString((r.instagram || r.name) + r.name) + (variant ?? 0);

  const subject = buildSubject(r, seed);
  const hook = buildHook(r, seed);
  const pain = buildPain(Math.floor(seed / 7));
  const outcome = buildOutcome(Math.floor(seed / 13));
  const close = buildClose(Math.floor(seed / 19));

  const body = `${hook}\n\n${pain}\n\n${outcome}\n\n${close}\n\n— [Your name]`;

  return validate(`SUBJECT: ${subject}\n\n${body}`);
}

export function generateRestaurantEmailVariant(r: RestaurantInfo, attempt = 0): string {
  return generateRestaurantEmail(r, attempt + (Date.now() % 1000));
}
