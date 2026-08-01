/**
 * Template-based message generator.
 *
 * Generates personalized cold DMs for UK martial arts gyms using a pool of
 * varied opening hooks + offer lines + CTAs. No external API needed — works
 * instantly anywhere (including Railway) with no API key or rate limits.
 *
 * Each message is unique per gym because the hook references the gym's
 * specific name, city, and discipline.
 *
 * IMPORTANT: No em dashes (—) or en dashes (–) are used anywhere in the
 * output. AI-generated text often uses em dashes, which Instagram and other
 * platforms can flag as bot-generated. We use periods and commas instead,
 * which look fully human-written.
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

// CTA templates — use %%NAME%% placeholder, replaced at generation time
// NO em dashes, NO en dashes. Periods and commas only.
const CTA_TEMPLATES: string[] = [
  "Want me to send a quick 2-min Loom showing what ads I'd run for %%NAME%% specifically?",
  "Happy to record a 2-min Loom showing exactly what ads I'd run for you. Want me to send it over?",
  "I can put together a 2-min Loom showing what your ad campaign would look like. Shall I send it?",
  "Could record a quick 2-min Loom showing what I'd actually run for your gym. Interested?",
  "Want me to shoot a quick 2-min Loom showing what I'd run for your gym specifically?",
];

function buildHook(lead: LeadInfo, seed: number): string {
  const disc = primaryDiscipline(lead);
  const city = lead.city || "the UK";
  const name = lead.name;

  const hooks: string[] = [
    `Saw ${name} popping up in ${city}. Your ${disc} setup looks legit.`,
    `${city} ${disc} scene is stacked, but ${name} stood out when I was looking through gyms in the area.`,
    `Quick one. Been looking at ${disc} gyms in ${city} and ${name} caught my eye.`,
    `${name} came up when I was researching ${disc} gyms in ${city}. Liked what I saw.`,
    `Noticed ${name} in ${city}. Solid ${disc} program from what I can see.`,
    `Been digging through ${disc} gyms in ${city} this week and ${name} was one of the few that actually stood out.`,
    `${city} has a lot of ${disc} gyms, but ${name} looks like it's doing things right.`,
    `Saw your posts. ${name} looks like a proper ${disc} gym, not one of those fitness-cardio places.`,
    `Came across ${name} while scoping out ${disc} gyms in ${city}. You've got a real setup, not a cardio-boxing class.`,
    `Your ${disc} gym in ${city} came up on my radar. ${name} looks like the real deal.`,
  ];

  return hooks[seed % hooks.length];
}

function buildOffer(seed: number): string {
  const offers: string[] = [
    "I run Google Ads for martial arts gyms in the UK. I'll run your first month free, you only cover ad spend (around £150-300), no management fee, no contract.",
    "I do Google Ads for UK martial arts gyms. First month is on me, you just cover the ad spend (around £150-300), no management fee, no lock-in contract.",
    "Quick context: I run Google Ads for MMA, Muay Thai and boxing gyms across the UK. First month free, you only pay the ad spend (around £150-300), no contract, no management fee.",
    "I help UK martial arts gyms get more members through Google Ads. First month free, you cover ad spend only (around £150-300), no management fee, cancel anytime.",
    "I run Google Ads specifically for martial arts gyms. Happy to run your first month free, you cover the ad spend (around £150-300), no management fee, no contract to sign.",
  ];
  return offers[seed % offers.length];
}

function buildCta(name: string, seed: number): string {
  const template = CTA_TEMPLATES[seed % CTA_TEMPLATES.length];
  return template.replace(/%%NAME%%/g, name);
}

// Simple deterministic hash so the same gym always gets the same message
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
  const offer = buildOffer(Math.floor(seed / 7));
  const cta = buildCta(lead.name, Math.floor(seed / 13));

  const message = `${hook}\n\n${offer}\n\n${cta}`;

  return message;
}

// Generate a message with a random variant (for "Regenerate" button)
export function generateMessageVariant(lead: LeadInfo, attempt = 0): string {
  return generateMessage(lead, attempt + (Date.now() % 1000));
}
