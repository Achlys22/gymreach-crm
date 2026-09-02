/**
 * Verified-only Scandinavian gym hunter.
 *
 * NO LLM data. Every handle comes from a real instagram.com URL found
 * in web search results. Safe for automation.
 *
 * Runs web search queries per country per discipline, extracts only
 * handles from instagram.com URLs in the results.
 *
 * Output: /tmp/scandi_verified_leads.json
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

const COUNTRIES = {
  Denmark: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle", "Roskilde", "Frederiksberg", "Hillerod"],
  Norway: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Tromso", "Sandnes", "Skien", "Asker", "Sandvika"],
  Sweden: ["Stockholm", "Gothenburg", "Malmo", "Uppsala", "Vasteras", "Orebro", "Helsingborg", "Jonkoping", "Linkoping", "Norrkoping", "Lund", "Boras"],
};

const DISCIPLINES = ["MMA", "Muay Thai", "boxing", "BJJ", "kickboxing", "martial arts"];

const NOISE = new Set([
  "p", "reel", "reels", "explore", "popular", "accounts", "about",
  "developer", "directory", "legal", "privacy", "help", "press",
  "api", "json", "www", "instagram", "stories", "tags", "locations",
  "embed", "inbox", "notifications", "settings", "edit", "session",
]);

function extractInstagram(url: string): string | null {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)\/?(\?|$)/i);
  if (!m) return null;
  const h = m[1].toLowerCase();
  if (NOISE.has(h) || h.length < 3) return null;
  // Skip post IDs
  if (/^[a-z0-9]{10,11}$/i.test(h) && !h.includes("_") && !h.includes(".")) return null;
  return h;
}

function extractName(title: string, handle: string): string {
  // "Gym Name (@handle) - City" → "Gym Name"
  const m = title.match(/^(.+?)\s*\(@/);
  if (m && m[1].trim().length > 2) return m[1].trim().slice(0, 80);
  // "Gym Name (@handle) · City"
  const m2 = title.match(/^(.+?)\s*[·-]/);
  if (m2 && m2[1].trim().length > 2 && !m2[1].includes("@")) return m2[1].trim().slice(0, 80);
  // Fallback: prettify handle
  return handle.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function searchWithRetry(zai: ZAI, query: string, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await zai.functions.invoke("web_search", { query, num: 10 });
      if (Array.isArray(r)) return r as never;
      return [];
    } catch (e) {
      if (attempt === retries) return [];
      const wait = 4000 * Math.pow(2, attempt); // 4s, 8s, 16s
      console.log(`  Retry ${attempt + 1}/${retries} after ${wait/1000}s...`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  return [];
}

interface VerifiedLead {
  handle: string;
  name: string;
  city: string | null;
  country: string;
  discipline: string;
  source: string;
  snippet: string;
}

function loadLeads(): Map<string, VerifiedLead> {
  const m = new Map<string, VerifiedLead>();
  if (existsSync("/tmp/scandi_verified_leads.json")) {
    try {
      const arr = JSON.parse(readFileSync("/tmp/scandi_verified_leads.json", "utf-8"));
      for (const h of arr) m.set(h.handle, h);
    } catch {}
  }
  return m;
}

async function huntCountry(zai: ZAI, country: string, cities: string[]) {
  const leads = loadLeads();
  const queries: string[] = [];

  // Country-wide site:instagram.com queries (highest yield)
  for (const disc of DISCIPLINES) {
    queries.push(`site:instagram.com ${disc} gym ${country}`);
  }

  // Per-city site:instagram.com queries
  for (const city of cities) {
    for (const disc of ["MMA", "Muay Thai", "boxing", "BJJ"]) {
      queries.push(`site:instagram.com ${disc} ${city} ${country}`);
    }
  }

  // Directory queries (these also surface instagram.com URLs)
  queries.push(`best MMA gyms ${country} Instagram list`);
  queries.push(`best Muay Thai gyms ${country} Instagram`);
  queries.push(`best boxing gyms ${country} Instagram`);
  queries.push(`best BJJ gyms ${country} Instagram`);
  queries.push(`top martial arts gyms ${country} Instagram handles`);
  queries.push(`${country} MMA gym directory Instagram`);
  queries.push(`${country} martial arts gym list Instagram`);

  console.log(`\n=== ${country}: ${queries.length} queries ===`);

  let before = 0;
  for (const countryLeads of [leads]) {
    before = [...countryLeads.values()].filter(l => l.country === country).length;
  }

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const results = await searchWithRetry(zai, q);

    // Infer discipline from query
    let discipline = "";
    for (const d of DISCIPLINES) {
      if (q.toLowerCase().includes(d.toLowerCase())) { discipline = d; break; }
    }

    // Infer city from query
    let city: string | null = null;
    for (const c of cities) {
      if (q.includes(c)) { city = c; break; }
    }

    let newCount = 0;
    for (const r of results) {
      const url = r.url || "";
      const h = extractInstagram(url);
      if (!h) continue;

      // ONLY accept if the URL is from instagram.com (verified)
      if (!url.includes("instagram.com")) continue;

      if (!leads.has(h)) {
        const name = extractName(r.name || "", h);
        leads.set(h, {
          handle: h,
          name,
          city,
          country,
          discipline,
          source: "instagram.com",
          snippet: (r.snippet || "").slice(0, 200),
        });
        newCount++;
      } else {
        // Enrich existing
        const existing = leads.get(h)!;
        if (!existing.city && city) existing.city = city;
        if (!existing.discipline && discipline) existing.discipline = discipline;
      }
    }

    // Save incrementally
    writeFileSync("/tmp/scandi_verified_leads.json", JSON.stringify([...leads.values()], null, 2));

    const countryCount = [...leads.values()].filter(l => l.country === country).length;
    console.log(`[${i+1}/${queries.length}] ${country}: ${countryCount} verified (${newCount} new)`);

    // Rate limit: 3s between queries (slower = fewer 429s)
    await new Promise((r) => setTimeout(r, 3000));
  }

  const after = [...leads.values()].filter(l => l.country === country).length;
  console.log(`\n${country}: ${before} → ${after} verified leads`);
}

async function main() {
  const zai = await ZAI.create();

  for (const [country, cities] of Object.entries(COUNTRIES)) {
    await huntCountry(zai, country, cities);
  }

  // Final stats
  const leads = loadLeads();
  const byCountry: Record<string, number> = {};
  for (const lead of leads.values()) {
    byCountry[lead.country] = (byCountry[lead.country] || 0) + 1;
  }

  console.log("\n=== VERIFIED HUNT COMPLETE ===");
  console.log(`Total verified leads: ${leads.size}`);
  for (const c of Object.keys(COUNTRIES)) {
    console.log(`  ${c}: ${byCountry[c] || 0}`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
