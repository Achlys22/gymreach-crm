/**
 * Scandinavian Gym Handle Hunter.
 *
 * Finds Instagram handles for MMA, Muay Thai, boxing, BJJ, kickboxing gyms
 * in Denmark, Norway, and Sweden.
 *
 * Two phases:
 *   1. Web search (site:instagram.com + directory queries per city)
 *   2. LLM recall (prompt the LLM per country per discipline)
 *
 * Output: /tmp/scandi_gym_leads.json
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

const COUNTRIES: { name: string; code: string; cities: string[] }[] = [
  {
    name: "Denmark",
    code: "DK",
    cities: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle", "Roskilde"],
  },
  {
    name: "Norway",
    code: "NO",
    cities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Tromso", "Sandnes", "Skien"],
  },
  {
    name: "Sweden",
    code: "SE",
    cities: ["Stockholm", "Gothenburg", "Malmo", "Uppsala", "Vasteras", "Orebro", "Helsingborg", "Jonkoping", "Linkoping", "Norrkoping"],
  },
];

const DISCIPLINES = ["MMA", "Muay Thai", "boxing", "BJJ", "kickboxing"];

// ---------------------------------------------------------------------------
// Web search queries
// ---------------------------------------------------------------------------
function generateWebQueries(): string[] {
  const queries: string[] = [];
  for (const country of COUNTRIES) {
    // site:instagram.com queries (high yield)
    queries.push(`site:instagram.com MMA gym ${country.name}`);
    queries.push(`site:instagram.com Muay Thai gym ${country.name}`);
    queries.push(`site:instagram.com boxing gym ${country.name}`);
    queries.push(`site:instagram.com BJJ gym ${country.name}`);
    queries.push(`site:instagram.com kickboxing gym ${country.name}`);
    // Per-city
    for (const city of country.cities) {
      queries.push(`site:instagram.com MMA gym ${city} ${country.name}`);
      queries.push(`site:instagram.com Muay Thai ${city} ${country.name}`);
      queries.push(`site:instagram.com boxing ${city} ${country.name}`);
    }
    // Directory / listicle
    queries.push(`best MMA gyms ${country.name} Instagram list`);
    queries.push(`best Muay Thai gyms ${country.name} Instagram`);
    queries.push(`best boxing gyms ${country.name} Instagram handles`);
    queries.push(`best BJJ gyms ${country.name} Instagram`);
    queries.push(`top martial arts gyms ${country.name} Instagram`);
  }
  return queries;
}

// ---------------------------------------------------------------------------
// LLM recall prompts
// ---------------------------------------------------------------------------
function generateLlmPrompts(): { country: string; discipline: string; prompt: string }[] {
  const prompts: { country: string; discipline: string; prompt: string }[] = [];
  for (const country of COUNTRIES) {
    for (const disc of DISCIPLINES) {
      prompts.push({
        country: country.name,
        discipline: disc,
        prompt: `List as many REAL ${disc} gyms in ${country.name} (Scandinavia) as you can that have Instagram accounts. Include all cities. Output one line per gym: HANDLE|NAME|CITY. No @ in handle. Only real gyms you are confident about. List 20-40 gyms.`,
      });
    }
    // General prompt (all disciplines)
    prompts.push({
      country: country.name,
      discipline: "all",
      prompt: `List 40 REAL martial arts gyms in ${country.name} (MMA, Muay Thai, boxing, BJJ, kickboxing) that have Instagram accounts. Mix of cities and disciplines. Output one line per gym: HANDLE|NAME|CITY|DISCIPLINE. No @ in handle. Only real gyms.`,
    });
    prompts.push({
      country: country.name,
      discipline: "all2",
      prompt: `List 40 MORE real martial arts gyms in ${country.name} (different from before) with Instagram accounts. MMA, Muay Thai, boxing, BJJ, kickboxing. Output one line per gym: HANDLE|NAME|CITY|DISCIPLINE. No @.`,
    });
  }
  return prompts;
}

// ---------------------------------------------------------------------------
// Handle extraction
// ---------------------------------------------------------------------------
const NOISE = new Set([
  "p", "reel", "reels", "explore", "popular", "accounts", "about",
  "developer", "directory", "legal", "privacy", "help", "press",
  "api", "json", "www", "instagram", "stories", "tags", "locations",
  "embed", "inbox", "notifications", "settings", "edit", "session",
]);

function extractInstagram(url: string, snippet: string): string | null {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)\/?(\?|$)/i);
  if (m) {
    const h = m[1].toLowerCase();
    if (!NOISE.has(h) && h.length >= 3) {
      if (!/^[a-z0-9]{10,11}$/i.test(h) || h.includes("_") || h.includes(".")) {
        return h;
      }
    }
  }
  const atMatch = snippet.match(/@([A-Za-z0-9._]{3,30})/);
  if (atMatch) {
    const h = atMatch[1].toLowerCase();
    if (!NOISE.has(h) && !h.includes("..") && h.length >= 3) {
      return h;
    }
  }
  return null;
}

function parseLlmLine(line: string, country: string): { handle: string; name: string; city: string; discipline: string } | null {
  const parts = line.trim().split("|");
  if (parts.length < 2) return null;
  const handle = parts[0].replace(/^@/, "").trim().toLowerCase();
  const name = parts[1].trim();
  const city = parts[2]?.trim() || "";
  const discipline = parts[3]?.trim() || "";
  if (!handle || !name || handle.length < 2) return null;
  if (handle.includes("/") || handle.includes(".") || handle.includes(" ")) return null;
  if (/^(https?|www|instagram|com|p|reel)/i.test(handle)) return null;
  return { handle, name, city, discipline };
}

function inferCountry(city: string, fallback: string): string {
  const c = city.toLowerCase();
  const dk = ["copenhagen", "aarhus", "odense", "aalborg", "esbjerg", "randers", "kolding", "horsens", "vejle", "roskilde", "kbh", "københavn"];
  const no = ["oslo", "bergen", "trondheim", "stavanger", "drammen", "fredrikstad", "kristiansand", "tromso", "sandnes", "skien"];
  const se = ["stockholm", "gothenburg", "malmo", "uppsala", "vasteras", "orebro", "helsingborg", "jonkoping", "linkoping", "norrkoping", "goteborg", "malmö", "köpenhamn"];
  if (dk.some((x) => c.includes(x))) return "Denmark";
  if (no.some((x) => c.includes(x))) return "Norway";
  if (se.some((x) => c.includes(x))) return "Sweden";
  return fallback;
}

// ---------------------------------------------------------------------------
// Search with retry
// ---------------------------------------------------------------------------
async function searchWithRetry(zai: ZAI, query: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await zai.functions.invoke("web_search", { query, num: 10 });
      if (Array.isArray(r)) return r as never;
      return [];
    } catch {
      if (attempt === retries) return [];
      await new Promise((res) => setTimeout(res, 3000 * Math.pow(2, attempt)));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface FoundLead {
  handle: string;
  name: string;
  city: string | null;
  country: string;
  discipline: string;
  source: string;
  snippet: string;
}

function loadLeads(): Map<string, FoundLead> {
  const m = new Map<string, FoundLead>();
  if (existsSync("/tmp/scandi_gym_leads.json")) {
    try {
      const arr = JSON.parse(readFileSync("/tmp/scandi_gym_leads.json", "utf-8"));
      for (const h of arr) m.set(h.handle, h);
    } catch {}
  }
  return m;
}

async function main() {
  const zai = await ZAI.create();
  const leads = loadLeads();
  console.log(`Starting with ${leads.size} existing leads`);

  // --- Phase 1: Web search ---
  const webQueries = generateWebQueries();
  console.log(`\n=== Phase 1: Web search (${webQueries.length} queries) ===`);

  for (let i = 0; i < webQueries.length; i++) {
    const q = webQueries[i];
    const results = await searchWithRetry(zai, q);

    // Infer country from query
    let country = "Unknown";
    for (const c of COUNTRIES) {
      if (q.includes(c.name)) { country = c.name; break; }
    }

    for (const r of results) {
      const h = extractInstagram(r.url || "", r.snippet || "");
      if (!h) continue;
      const name = (r.name || "").split(" (")[0].split(" - ")[0].slice(0, 80) || h;
      if (!leads.has(h)) {
        leads.set(h, {
          handle: h,
          name,
          city: null,
          country,
          discipline: "",
          source: r.host_name || "web",
          snippet: (r.snippet || "").slice(0, 200),
        });
      }
    }

    if ((i + 1) % 10 === 0 || i + 1 === webQueries.length) {
      console.log(`[Web ${i + 1}/${webQueries.length}] ${leads.size} unique handles`);
      writeFileSync("/tmp/scandi_gym_leads.json", JSON.stringify([...leads.values()], null, 2));
    }
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log(`\nWeb search complete: ${leads.size} handles`);

  // --- Phase 2: LLM recall ---
  const llmPrompts = generateLlmPrompts();
  console.log(`\n=== Phase 2: LLM recall (${llmPrompts.length} prompts) ===`);

  for (let i = 0; i < llmPrompts.length; i++) {
    const { country, discipline, prompt } = llmPrompts[i];
    console.log(`[LLM ${i + 1}/${llmPrompts.length}] ${country} / ${discipline}...`);
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are a Scandinavian martial arts scene expert. Output structured data only." },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content || "";
      let count = 0;
      for (const line of text.split("\n")) {
        const parsed = parseLlmLine(line, country);
        if (parsed && !leads.has(parsed.handle)) {
          leads.set(parsed.handle, {
            handle: parsed.handle,
            name: parsed.name,
            city: parsed.city || null,
            country: inferCountry(parsed.city, country),
            discipline: parsed.discipline,
            source: "LLM",
            snippet: "",
          });
          count++;
        }
      }
      console.log(`  +${count} new (${leads.size} total)`);
    } catch (e) {
      console.log(`  FAILED: ${e instanceof Error ? e.message : "error"}`);
    }
    writeFileSync("/tmp/scandi_gym_leads.json", JSON.stringify([...leads.values()], null, 2));
    await new Promise((r) => setTimeout(r, 1500));
  }

  // --- Stats ---
  const byCountry: Record<string, number> = {};
  for (const lead of leads.values()) {
    byCountry[lead.country] = (byCountry[lead.country] || 0) + 1;
  }

  console.log("\n=== HUNT COMPLETE ===");
  console.log(`Total unique handles: ${leads.size}`);
  for (const c of COUNTRIES) {
    console.log(`  ${c.name}: ${byCountry[c.name] || 0}`);
  }
  writeFileSync("/tmp/scandi_gym_leads.json", JSON.stringify([...leads.values()], null, 2));
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
