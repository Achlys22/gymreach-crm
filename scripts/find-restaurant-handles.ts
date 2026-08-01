/**
 * Restaurant handle hunter.
 *
 * Runs targeted web searches + LLM recall across UK cities × cuisines,
 * then extracts every Instagram handle that appears in public results.
 * Does NOT scrape Instagram — reads public search snippets/URLs only.
 *
 * Output: /tmp/restaurant_handles.json
 *
 * Usage: bun run scripts/find-restaurant-handles.ts
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

// ---------------------------------------------------------------------------
// Cities (tier 1 + tier 2)
// ---------------------------------------------------------------------------
const CITIES: string[] = [
  // Tier 1 — primary targets
  "Manchester", "Bristol", "Leeds", "Birmingham",
  // Tier 2 — volume
  "London", "Liverpool", "Sheffield", "Nottingham",
  "Leicester", "Coventry", "Newcastle", "Brighton",
  "Edinburgh", "Glasgow", "Cardiff", "Belfast",
  // Tier 3 — secondary
  "Bath", "Oxford", "Cambridge", "York", "Harrogate",
  "Chester", "Durham", "Exeter", "Plymouth", "Southampton",
  "Bournemouth", "Reading", "Milton Keynes", "Norwich", "Ipswich",
  // London areas
  "Shoreditch", "Soho", "Brixton", "Peckham", "Camden", "Islington",
  "Greenwich", "Hackney", "Clapham", "Kensington", "Chelsea",
];

const CUISINES = [
  "Italian", "Indian", "Thai", "Japanese", "Chinese", "Mexican",
  "fine dining", "independent", "steakhouse", "Mediterranean",
  "French", "Spanish", "Korean", "Vietnamese", "Middle Eastern",
  "Caribbean", "seafood", "vegan", "pub restaurant",
] as const;

// ---------------------------------------------------------------------------
// Query builders
// ---------------------------------------------------------------------------
function cityQueries(): string[] {
  const out: string[] = [];
  for (const city of CITIES) {
    for (const c of CUISINES) {
      out.push(`${city} ${c} restaurant Instagram handle UK`);
    }
  }
  return out;
}

function directoryQueries(): string[] {
  return [
    "best restaurants Manchester Instagram handles list",
    "best restaurants Bristol Instagram list",
    "best restaurants Leeds Instagram list",
    "best restaurants Birmingham Instagram list",
    "top 50 UK independent restaurants Instagram",
    "best Italian restaurants UK Instagram list",
    "best Indian restaurants UK Instagram handles",
    "best Thai restaurants UK Instagram list",
    "best fine dining UK Instagram handles",
    "best vegan restaurants UK Instagram",
    "Manchester food scene Instagram restaurants",
    "Bristol food scene Instagram restaurants",
    "Leeds independent restaurants Instagram",
    "London independent restaurants Instagram list",
    "best new restaurants UK 2024 Instagram",
    "best restaurants Northern Quarter Manchester Instagram",
    "best restaurants Ancoats Manchester Instagram",
    "best restaurants Clifton Bristol Instagram",
    "best restaurants Call Lane Leeds Instagram",
    "best restaurants Digbeth Birmingham Instagram",
    "best curry houses UK Instagram handles",
    "best pizza restaurants UK Instagram",
    "best sushi restaurants UK Instagram",
    "best brunch spots UK Instagram restaurants",
    "best wine bars UK Instagram restaurants",
  ];
}

function siteQueries(): string[] {
  const terms = [
    "restaurant Manchester", "restaurant Bristol", "restaurant Leeds",
    "restaurant Birmingham", "restaurant London", "restaurant Liverpool",
    "restaurant Sheffield", "restaurant Nottingham", "restaurant Brighton",
    "restaurant Edinburgh", "restaurant Glasgow", "restaurant Cardiff",
    "Italian restaurant Manchester", "Italian restaurant London",
    "Indian restaurant Manchester", "Indian restaurant Birmingham",
    "Indian restaurant London", "Thai restaurant London",
    "Thai restaurant Manchester", "fine dining Manchester",
    "fine dining London", "fine dining Edinburgh",
    "steakhouse Manchester", "steakhouse London",
    "vegan restaurant London", "vegan restaurant Manchester",
    "seafood restaurant London", "pub restaurant UK",
    "kitchen restaurant UK", "dining room restaurant UK",
    "brunch restaurant London", "brunch restaurant Manchester",
    "wine bar restaurant London", "wine bar restaurant Bristol",
  ];
  return terms.map((t) => `site:instagram.com ${t}`);
}

// ---------------------------------------------------------------------------
// Handle extraction
// ---------------------------------------------------------------------------
const NOISE = new Set([
  "p", "reel", "reels", "explore", "popular", "accounts", "about",
  "developer", "directory", "legal", "privacy", "help", "press",
  "api", "json", "static.cdn", "www", "instagram", "stories",
  "tags", "locations", "embed", "inbox", "notifications", "settings",
  "edit", "session", "data", "challenge", "signup",
]);

function extractHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)\/?(\?|$)/i);
  if (!m) return null;
  const h = m[1].toLowerCase();
  if (NOISE.has(h)) return null;
  if (h.length < 3) return null;
  if (/^[a-z0-9]{10,11}$/i.test(h) && !h.includes("_") && !h.includes(".")) return null;
  return h;
}

// ---------------------------------------------------------------------------
// Region + cuisine inference
// ---------------------------------------------------------------------------
function regionFor(city: string): string {
  const c = city.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => c.includes(k));
  if (has("dublin", "cork")) return "Ireland";
  if (has("belfast", "derry")) return "Northern Ireland";
  if (has("edinburgh", "glasgow", "aberdeen", "dundee")) return "Scotland";
  if (has("cardiff", "swansea", "newport")) return "Wales";
  if (has("london", "shoreditch", "soho", "brixton", "peckham", "camden", "islington", "greenwich", "hackney", "clapham", "kensington", "chelsea")) return "London";
  if (has("brighton", "reading", "southampton", "bournemouth", "portsmouth", "oxford", "milton keynes", "surrey", "kent", "sussex", "hampshire")) return "South East";
  if (has("bristol", "bath", "exeter", "plymouth", "devon", "cornwall", "somerset", "dorset", "wiltshire")) return "South West";
  if (has("birmingham", "coventry", "nottingham", "leicester", "wolverhampton", "stoke")) return "Midlands";
  if (has("leeds", "sheffield", "york", "harrogate", "bradford", "yorkshire", "huddersfield")) return "Yorkshire";
  if (has("manchester", "liverpool", "chester", "lancashire", "preston", "blackpool", "wigan", "bolton", "burnley", "blackburn")) return "North West";
  if (has("newcastle", "durham", "sunderland", "tyne")) return "North East";
  return "UK";
}

function cityFromQuery(q: string): string | null {
  for (const c of CITIES) {
    if (new RegExp(`\\b${c.replace(/[-]/g, "\\-")}\\b`, "i").test(q)) return c;
  }
  return null;
}

function cuisineFromQuery(q: string): string | null {
  for (const c of CUISINES) {
    if (new RegExp(`\\b${c}\\b`, "i").test(q)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Search with retry
// ---------------------------------------------------------------------------
const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 2200;

async function searchWithRetry(
  zai: ZAI,
  query: string,
  retries = 3
): Promise<{ url: string; name: string; snippet: string; host_name: string }[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await zai.functions.invoke("web_search", { query, num: 10 });
      if (Array.isArray(r)) return r as never;
      return [];
    } catch {
      if (attempt === retries) return [];
      const wait = 3000 * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// LLM recall
// ---------------------------------------------------------------------------
async function llmRecall(zai: ZAI): Promise<Map<string, { handle: string; name: string; city: string; cuisine: string }>> {
  const handles = new Map<string, { handle: string; name: string; city: string; cuisine: string }>();

  const prompts = [
    { region: "Manchester", q: "List as many REAL independent restaurants in Manchester, UK as you can that have Instagram accounts. Include all cuisines. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 20-40 restaurants." },
    { region: "Bristol", q: "List as many REAL independent restaurants in Bristol, UK as you can that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 20-40 restaurants." },
    { region: "Leeds", q: "List as many REAL independent restaurants in Leeds, UK as you can that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 20-40 restaurants." },
    { region: "Birmingham", q: "List as many REAL independent restaurants in Birmingham, UK as you can that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 20-40 restaurants." },
    { region: "London", q: "List as many REAL independent restaurants in London, UK as you can that have Instagram accounts. Mix of cuisines. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 40-60 restaurants." },
    { region: "Edinburgh", q: "List as many REAL independent restaurants in Edinburgh, Scotland that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-30 restaurants." },
    { region: "Glasgow", q: "List as many REAL independent restaurants in Glasgow, Scotland that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-30 restaurants." },
    { region: "Brighton", q: "List as many REAL independent restaurants in Brighton, UK that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-30 restaurants." },
    { region: "Liverpool", q: "List as many REAL independent restaurants in Liverpool, UK that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-30 restaurants." },
    { region: "Sheffield", q: "List as many REAL independent restaurants in Sheffield, UK that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-25 restaurants." },
    { region: "Nottingham", q: "List as many REAL independent restaurants in Nottingham, UK that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-25 restaurants." },
    { region: "Cardiff", q: "List as many REAL independent restaurants in Cardiff, Wales that have Instagram accounts. Output one line per restaurant: HANDLE|NAME|CITY. No @ in handle. 15-25 restaurants." },
  ];

  for (let i = 0; i < prompts.length; i++) {
    const { region, q } = prompts[i];
    console.log(`[LLM ${i + 1}/${prompts.length}] ${region}...`);
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are a UK food scene expert. Output structured data only." },
          { role: "user", content: q },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content || "";
      const lines = text.split("\n");
      let count = 0;
      for (const line of lines) {
        const parts = line.trim().split("|");
        if (parts.length < 2) continue;
        const handle = parts[0].replace(/^@/, "").trim().toLowerCase();
        const name = parts[1].trim();
        if (!handle || !name || handle.length < 2) continue;
        if (handle.includes("/") || handle.includes(".")) continue;
        if (/^(https?|www|instagram|com)/i.test(handle)) continue;
        if (!handles.has(handle)) {
          handles.set(handle, { handle, name, city: region, cuisine: "" });
          count++;
        }
      }
      console.log(`  +${count} (${handles.size} total)`);
    } catch (e) {
      console.log(`  FAILED: ${e instanceof Error ? e.message : "error"}`);
    }
    writeFileSync("/tmp/restaurant_llm_handles.json", JSON.stringify([...handles.values()], null, 2));
    await new Promise((r) => setTimeout(r, 2000));
  }

  return handles;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface FoundHandle {
  handle: string;
  city: string | null;
  region: string;
  cuisine: string | null;
  source: string;
  snippet: string;
  title: string;
}

interface Progress {
  doneQueries: string[];
}

function loadProgress(): Progress {
  if (existsSync("/tmp/restaurant_progress.json")) {
    try {
      return JSON.parse(readFileSync("/tmp/restaurant_progress.json", "utf-8"));
    } catch {
      return { doneQueries: [] };
    }
  }
  return { doneQueries: [] };
}

function loadHandles(): Map<string, FoundHandle> {
  const m = new Map<string, FoundHandle>();
  if (existsSync("/tmp/restaurant_handles.json")) {
    try {
      const arr = JSON.parse(readFileSync("/tmp/restaurant_handles.json", "utf-8"));
      for (const h of arr) m.set(h.handle, h);
    } catch {}
  }
  return m;
}

async function main() {
  const allQueries = [...siteQueries(), ...directoryQueries(), ...cityQueries()];
  console.log(`=== Restaurant Handle Hunter ===`);
  console.log(`Total web search queries: ${allQueries.length}`);

  const progress = loadProgress();
  const handles = loadHandles();
  const doneSet = new Set(progress.doneQueries);
  const remaining = allQueries.filter((q) => !doneSet.has(q));
  console.log(`Already done: ${doneSet.size}, remaining: ${remaining.length}`);

  const zai = await ZAI.create();

  // --- Phase 1: Web search hunter ---
  let batchesDone = 0;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (q) => ({ q, results: await searchWithRetry(zai, q) }))
    );

    for (const { q, results } of batchResults) {
      progress.doneQueries.push(q);
      const city = cityFromQuery(q);
      const region = city ? regionFor(city) : "UK";
      const cuisine = cuisineFromQuery(q);

      for (const r of results) {
        const h = extractHandle(r.url || "");
        if (!h) continue;
        const existing = handles.get(h);
        const snippet = (r.snippet || "").slice(0, 300);
        const title = (r.name || "").slice(0, 200);
        if (!existing) {
          handles.set(h, {
            handle: h, city, region, cuisine, source: r.host_name || "",
            snippet, title,
          });
        } else {
          if (!existing.city && city) existing.city = city;
          if (!existing.cuisine && cuisine) existing.cuisine = cuisine;
          if (existing.region === "UK" && region !== "UK") existing.region = region;
          if (existing.snippet.length < snippet.length) {
            existing.snippet = snippet;
            existing.title = title;
          }
        }
      }
    }

    batchesDone++;
    writeFileSync("/tmp/restaurant_handles.json", JSON.stringify([...handles.values()], null, 2));
    writeFileSync("/tmp/restaurant_progress.json", JSON.stringify(progress, null, 2));

    if (batchesDone % 10 === 0 || batchesDone === totalBatches) {
      console.log(`[Web] Batch ${batchesDone}/${totalBatches} — ${handles.size} unique handles`);
    }
    if (i + BATCH_SIZE < remaining.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  console.log(`\n=== Web search complete: ${handles.size} handles ===`);

  // --- Phase 2: LLM recall ---
  console.log(`\n=== Phase 2: LLM recall ===`);
  const llmHandles = await llmRecall(zai);

  // Merge LLM handles into main map
  for (const [handle, info] of llmHandles) {
    if (!handles.has(handle)) {
      handles.set(handle, {
        handle, city: info.city, region: regionFor(info.city), cuisine: info.cuisine || null,
        source: "LLM", snippet: "", title: info.name,
      });
    }
  }

  writeFileSync("/tmp/restaurant_handles.json", JSON.stringify([...handles.values()], null, 2));
  console.log(`\n=== FINAL: ${handles.size} unique restaurant handles ===`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
