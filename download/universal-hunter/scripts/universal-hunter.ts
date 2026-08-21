/**
 * Universal Lead Hunter
 *
 * A legitimate web-search research tool that finds publicly-listed contact
 * info (Instagram handles, emails, phone numbers) for ANY niche in ANY
 * location. Does NOT scrape Instagram directly (against ToS). Reads public
 * search engine results only.
 *
 * Usage:
 *   bun run scripts/universal-hunter.ts --config scripts/hunter-configs/dentists-uk.json
 *   bun run scripts/universal-hunter.ts --niche "plumbers" --country "Germany" --cities "Berlin,Munich,Hamburg"
 *
 * Output: /tmp/universal-leads.json + /tmp/universal-leads.csv
 *
 * Config file format (JSON):
 * {
 *   "niche": "dentists",
 *   "country": "UK",
 *   "cities": ["London", "Manchester", "Birmingham"],
 *   "extract": ["instagram", "email", "phone"],  // what to extract
 *   "languages": ["en"],                          // optional
 *   "maxQueries": 100                             // optional, default 100
 * }
 */

import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HunterConfig {
  niche: string;           // e.g. "dentists", "plumbers", "restaurants"
  country: string;         // e.g. "UK", "Germany", "USA"
  cities: string[];        // e.g. ["London", "Manchester"]
  extract: string[];       // ["instagram", "email", "phone"] — which to extract
  languages?: string[];    // optional: ["en", "de", "fr"]
  maxQueries?: number;     // optional: cap on total queries (default 100)
}

interface FoundLead {
  name: string;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string;
  niche: string;
  source: string;
  snippet: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(): { configPath?: string; niche?: string; country?: string; cities?: string } {
  const args = process.argv.slice(2);
  const result: { configPath?: string; niche?: string; country?: string; cities?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      result.configPath = args[i + 1];
      i++;
    } else if (args[i] === "--niche" && args[i + 1]) {
      result.niche = args[i + 1];
      i++;
    } else if (args[i] === "--country" && args[i + 1]) {
      result.country = args[i + 1];
      i++;
    } else if (args[i] === "--cities" && args[i + 1]) {
      result.cities = args[i + 1];
      i++;
    }
  }

  return result;
}

function loadConfig(): HunterConfig {
  const args = parseArgs();

  if (args.configPath) {
    if (!existsSync(args.configPath)) {
      console.error(`Config file not found: ${args.configPath}`);
      process.exit(1);
    }
    return JSON.parse(readFileSync(args.configPath, "utf-8"));
  }

  if (args.niche && args.country && args.cities) {
    return {
      niche: args.niche,
      country: args.country,
      cities: args.cities.split(",").map((c) => c.trim()),
      extract: ["instagram", "email", "phone"],
    };
  }

  console.error("Usage:");
  console.error("  bun run scripts/universal-hunter.ts --config <path>");
  console.error("  bun run scripts/universal-hunter.ts --niche 'dentists' --country 'UK' --cities 'London,Manchester'");
  console.error("\nExample configs in scripts/hunter-configs/");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Query generation
// ---------------------------------------------------------------------------
function generateQueries(config: HunterConfig): string[] {
  const queries: string[] = [];
  const niche = config.niche;
  const country = config.country;

  // Site queries (Instagram-focused)
  if (config.extract.includes("instagram")) {
    for (const city of config.cities) {
      queries.push(`site:instagram.com ${niche} ${city} ${country}`);
    }
    // Country-wide
    queries.push(`site:instagram.com ${niche} ${country}`);
  }

  // Directory queries (good for emails + phones)
  for (const city of config.cities) {
    queries.push(`best ${niche} in ${city} ${country} contact email phone`);
    queries.push(`${niche} ${city} ${country} directory list`);
  }

  // Country-wide directory
  queries.push(`top ${niche} in ${country} list contact`);
  queries.push(`best ${niche} ${country} email phone number`);

  // Per-city specific queries
  for (const city of config.cities) {
    queries.push(`${niche} ${city} ${country} Instagram handle`);
    if (config.extract.includes("email")) {
      queries.push(`${niche} ${city} ${country} email contact`);
    }
    if (config.extract.includes("phone")) {
      queries.push(`${niche} ${city} ${country} phone number booking`);
    }
  }

  // Listicle queries (high yield)
  queries.push(`best 50 ${niche} in ${country}`);
  queries.push(`top ${niche} ${country} list`);

  // Cap at maxQueries
  const cap = config.maxQueries ?? 100;
  return queries.slice(0, cap);
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------
const NOISE_IG = new Set([
  "p", "reel", "reels", "explore", "popular", "accounts", "about",
  "developer", "directory", "legal", "privacy", "help", "press",
  "api", "json", "www", "instagram", "stories", "tags", "locations",
  "embed", "inbox", "notifications", "settings", "edit", "session",
]);

function extractInstagram(url: string, snippet: string): string | null {
  // From URL: instagram.com/handle
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)\/?(\?|$)/i);
  if (m) {
    const h = m[1].toLowerCase();
    if (!NOISE_IG.has(h) && h.length >= 3) {
      // Skip post IDs (10-11 char alphanum, no _ or .)
      if (!/^[a-z0-9]{10,11}$/i.test(h) || h.includes("_") || h.includes(".")) {
        return h;
      }
    }
  }

  // From snippet: @handle
  const atMatch = snippet.match(/@([A-Za-z0-9._]{3,30})/);
  if (atMatch) {
    const h = atMatch[1].toLowerCase();
    if (!NOISE_IG.has(h) && !h.includes("..") && h.length >= 3) {
      return h;
    }
  }

  return null;
}

function extractEmail(text: string): string | null {
  // Standard email regex
  const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (m) {
    const email = m[1].toLowerCase();
    // Filter out common false positives
    const bad = ["example.com", "sentry.io", "domain.com", "email.com", "your.com"];
    if (!bad.some((b) => email.includes(b))) {
      return email;
    }
  }
  return null;
}

function extractPhone(text: string, country: string): string | null {
  // UK format: 0207 123 4567, +44 207 123 4567
  // US format: (555) 123-4567, +1 555-123-4567
  // EU format: +49 30 12345678, +33 1 23 45 67 89
  // Generic: looks for patterns with + or 0 + 10+ digits

  const patterns = [
    /\+?\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up
        const cleaned = match.replace(/[^\d+]/g, "");
        // Must have at least 10 digits
        if (cleaned.replace(/\D/g, "").length >= 10) {
          // Filter out years, IDs, etc.
          if (!cleaned.match(/^\d{4}$/) && !cleaned.includes(".")) {
            return match.trim();
          }
        }
      }
    }
  }

  return null;
}

function extractName(title: string, url: string, handle: string | null): string {
  // Try to extract from title: "Business Name (@handle) - City"
  const m = title.match(/^(.+?)\s*[\(\|@]|^(.+?)\s*[-–—]\s/);
  if (m && (m[1] || m[2])) {
    const name = (m[1] || m[2]).trim();
    if (name.length > 2 && name.length < 80) return name;
  }

  // Fallback: prettify handle
  if (handle) {
    return handle
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  // Last resort: domain name
  const domainMatch = url.match(/\/\/([^/]+)\./);
  if (domainMatch) {
    return domainMatch[1]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  return "Unknown";
}

// ---------------------------------------------------------------------------
// Search with retry
// ---------------------------------------------------------------------------
async function searchWithRetry(
  zai: ZAI,
  query: string,
  retries = 2
): Promise<{ url: string; name: string; snippet: string; host_name: string }[]> {
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
// City/region inference
// ---------------------------------------------------------------------------
function inferCity(query: string, cities: string[]): string | null {
  for (const c of cities) {
    if (new RegExp(`\\b${c}\\b`, "i").test(query)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const config = loadConfig();

  console.log("=== Universal Lead Hunter ===");
  console.log(`Niche: ${config.niche}`);
  console.log(`Country: ${config.country}`);
  console.log(`Cities: ${config.cities.join(", ")}`);
  console.log(`Extract: ${config.extract.join(", ")}`);
  console.log("");

  const queries = generateQueries(config);
  console.log(`Generated ${queries.length} queries`);

  const zai = await ZAI.create();
  const leads = new Map<string, FoundLead>();

  let queryNum = 0;
  for (const query of queries) {
    queryNum++;
    const results = await searchWithRetry(zai, query);

    const city = inferCity(query, config.cities);

    for (const r of results) {
      const url = r.url || "";
      const snippet = (r.snippet || "").slice(0, 500);
      const title = (r.name || "").slice(0, 200);
      const fullText = `${title} ${snippet} ${url}`;

      let instagram: string | null = null;
      let email: string | null = null;
      let phone: string | null = null;

      if (config.extract.includes("instagram")) {
        instagram = extractInstagram(url, snippet);
      }
      if (config.extract.includes("email")) {
        email = extractEmail(fullText);
      }
      if (config.extract.includes("phone")) {
        phone = extractPhone(fullText, config.country);
      }

      // Skip if nothing found
      if (!instagram && !email && !phone) continue;

      const name = extractName(title, url, instagram);

      // Dedupe by instagram (if available) or email or phone
      const dedupeKey = instagram || email || phone || `${name}-${city}`;
      if (leads.has(dedupeKey)) {
        // Enrich existing
        const existing = leads.get(dedupeKey)!;
        if (!existing.instagram && instagram) existing.instagram = instagram;
        if (!existing.email && email) existing.email = email;
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.city && city) existing.city = city;
        continue;
      }

      leads.set(dedupeKey, {
        name,
        instagram,
        email,
        phone,
        city,
        region: null,
        country: config.country,
        niche: config.niche,
        source: r.host_name || "",
        snippet: snippet.slice(0, 200),
        url,
      });
    }

    if (queryNum % 10 === 0 || queryNum === queries.length) {
      console.log(`[${queryNum}/${queries.length}] ${leads.size} unique leads found`);
      // Save incrementally
      writeFileSync("/tmp/universal-leads.json", JSON.stringify([...leads.values()], null, 2));
    }

    // Rate limit: 2s between queries
    await new Promise((r) => setTimeout(r, 2200));
  }

  const allLeads = [...leads.values()];

  // Save JSON
  writeFileSync("/tmp/universal-leads.json", JSON.stringify(allLeads, null, 2));

  // Save CSV
  const csvHeaders = ["name", "instagram", "email", "phone", "city", "country", "niche", "source", "url"];
  const csvRows = allLeads.map((l) =>
    [l.name, l.instagram || "", l.email || "", l.phone || "", l.city || "", l.country, l.niche, l.source, l.url]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  writeFileSync("/tmp/universal-leads.csv", [csvHeaders.join(","), ...csvRows].join("\n"));

  // Stats
  const withIg = allLeads.filter((l) => l.instagram).length;
  const withEmail = allLeads.filter((l) => l.email).length;
  const withPhone = allLeads.filter((l) => l.phone).length;

  console.log("\n=== HUNT COMPLETE ===");
  console.log(`Total leads: ${allLeads.length}`);
  console.log(`With Instagram: ${withIg}`);
  console.log(`With email: ${withEmail}`);
  console.log(`With phone: ${withPhone}`);
  console.log(`\nSaved to:`);
  console.log(`  /tmp/universal-leads.json`);
  console.log(`  /tmp/universal-leads.csv`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
