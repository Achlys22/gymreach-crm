/**
 * Gym handle hunter v2 — rate-limited, retrying, incremental.
 *
 * Runs targeted web searches across UK cities × {MMA, Muay Thai, boxing}
 * plus directory / listicle queries, then extracts every Instagram handle
 * that appears in the public search-engine results. We do NOT scrape
 * Instagram — we only read public search snippets + URLs.
 *
 * Key features:
 *   - Small batches (3 parallel) with delay between batches
 *   - Exponential backoff retry on 429 / 5xx
 *   - Incremental save after every batch (crash-safe)
 *   - Resumable: skips queries already in the results file
 *
 * Output: /tmp/gym_handles.json  +  /tmp/gym_progress.json
 *
 * Usage:  bun run scripts/find-gym-handles.ts
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
const CITIES: string[] = [
  // England — major
  "London", "Manchester", "Birmingham", "Leeds", "Sheffield", "Liverpool",
  "Newcastle", "Nottingham", "Leicester", "Coventry", "Bradford", "Stoke-on-Trent",
  "Wolverhampton", "Plymouth", "Southampton", "Reading", "Derby", "Brighton",
  "Hull", "Bristol", "Wakefield", "Cardiff", "Belfast",
  "Bolton", "Preston", "Blackpool", "Wigan", "Warrington", "Chester", "Lancaster",
  "Doncaster", "York", "Sunderland", "Middlesbrough", "Teesside", "Hartlepool",
  "Bournemouth", "Poole", "Portsmouth", "Southend", "Ipswich", "Norwich",
  "Cambridge", "Oxford", "Milton Keynes", "Luton", "Slough", "Watford",
  "St Albans", "Gloucester", "Cheltenham", "Worcester", "Hereford", "Shrewsbury",
  "Exeter", "Torquay", "Bath", "Swindon", "Telford", "Birkenhead",
  "Blackburn", "Burnley", "Huddersfield", "Barnsley", "Harrogate",
  // Scotland
  "Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness", "Stirling",
  "Perth", "Dunfermline", "Kilmarnock", "Falkirk", "Motherwell", "Coatbridge",
  // Wales
  "Swansea", "Newport", "Wrexham", "Barry", "Carmarthen", "Aberystwyth",
  // Northern Ireland
  "Derry", "Lisburn", "Newry", "Armagh", "Bangor",
  // Ireland
  "Dublin", "Cork", "Limerick", "Galway", "Waterford",
  // Greater London areas
  "East London", "West London", "North London", "South London",
  "Croydon", "Bromley", "Ealing", "Hackney", "Islington", "Wandsworth",
  "Camden", "Greenwich", "Lambeth", "Lewisham", "Southwark", "Tower Hamlets",
];

const DISCIPLINES = ["MMA", "Muay Thai", "boxing"] as const;

function cityQueries(): string[] {
  const out: string[] = [];
  for (const city of CITIES) {
    for (const d of DISCIPLINES) {
      out.push(`${city} ${d} gym Instagram handle UK`);
    }
  }
  return out;
}

function directoryQueries(): string[] {
  return [
    "best MMA gyms UK list Instagram handles",
    "top 20 MMA gyms England Instagram",
    "UK Muay Thai gym directory Instagram",
    "best boxing gyms UK list Instagram",
    "best MMA gyms London list Instagram",
    "best Muay Thai gyms London Instagram",
    "best boxing gyms London Instagram",
    "best MMA gyms Manchester Instagram",
    "best MMA gyms Birmingham Instagram",
    "best MMA gyms Scotland Instagram",
    "best MMA gyms Leeds Instagram",
    "best boxing gyms Liverpool Instagram",
    "best Muay Thai gyms UK listicle Instagram",
    "warrior collective UK Muay Thai gyms list Instagram",
    "UK MMA gym map directory Instagram",
    "tapology UK MMA gyms Instagram",
    "best combat sports gyms UK Instagram",
    "best martial arts gyms UK Instagram list",
    "top 50 UK boxing clubs Instagram",
    "amateur boxing clubs UK Instagram handles",
    "England boxing affiliated clubs Instagram",
    "Cagewarriors affiliated gyms UK Instagram",
    "UCMMA gyms UK Instagram",
    "best white collar boxing gyms UK Instagram",
    "best MMA gyms Ireland Dublin Instagram",
    "best boxing gyms Northern Ireland Instagram",
    "best MMA gyms Wales Cardiff Instagram",
    "best martial arts gyms Bristol Instagram",
    "best MMA gyms Brighton Instagram",
    "best boxing gyms Newcastle Instagram",
    "best Muay Thai gyms Sheffield Instagram",
    "best MMA gyms Nottingham Instagram",
    "best boxing gyms Sheffield Instagram",
    "best Muay Thai gyms Leeds Instagram",
    "best boxing gyms Leicester Instagram",
    "best MMA gyms Coventry Instagram",
    "best MMA gyms Hull Instagram",
    "best boxing gyms Plymouth Instagram",
    "best MMA gyms Southampton Instagram",
    "best Muay Thai gyms Birmingham Instagram",
    "best boxing gyms Essex Instagram",
    "best boxing gyms Kent Instagram",
    "best MMA gyms Surrey Instagram",
    "best Muay Thai gyms Brighton Instagram",
    "best boxing gyms Bournemouth Instagram",
    "best MMA gyms Swansea Instagram",
    "best boxing gyms Newport Instagram",
    "best MMA gyys Aberdeen Instagram",
    "best Muay Thai gyms Edinburgh Instagram",
    "best boxing gyms Glasgow Instagram",
    "best MMA gyms Dundee Instagram",
    "best MMA gyms Belfast Instagram",
    "best boxing gyms Derry Instagram",
    "best Muay Thai gyms Cork Instagram",
    "best boxing gyms Galway Instagram",
    "top UK MMA teams Instagram fight team",
    "UK Thai boxing gyms list Instagram",
    "best UK boxing gyms for white collar Instagram",
    "British boxing clubs Instagram directory",
    "UK kickboxing to MMA gyms Instagram",
  ];
}

function siteQueries(): string[] {
  const terms = [
    "MMA gym UK", "MMA gym London", "MMA gym Manchester", "MMA gym Birmingham",
    "MMA gym Leeds", "MMA gym Scotland", "MMA gym Glasgow", "MMA gym Edinburgh",
    "MMA gym Cardiff", "MMA gym Belfast", "MMA gym Dublin", "MMA gym Newcastle",
    "MMA gym Liverpool", "MMA gym Sheffield", "MMA gym Bristol",
    "MMA gym Brighton", "MMA gym Nottingham", "MMA gym Leicester",
    "MMA gym Coventry", "MMA gym Hull", "MMA gym Plymouth",
    "Muay Thai gym UK", "Muay Thai gym London", "Muay Thai gym Manchester",
    "Muay Thai gym Birmingham", "Muay Thai gym Leeds", "Muay Thai gym Scotland",
    "Muay Thai gym Glasgow", "Muay Thai gym Edinburgh", "Muay Thai gym Cardiff",
    "Muay Thai gym Belfast", "Muay Thai gym Dublin", "Muay Thai gym Brighton",
    "Muay Thai gym Bristol", "Muay Thai gym Sheffield", "Muay Thai gym Liverpool",
    "boxing gym UK", "boxing gym London", "boxing gym Manchester",
    "boxing gym Birmingham", "boxing gym Leeds", "boxing gym Liverpool",
    "boxing gym Glasgow", "boxing gym Edinburgh", "boxing gym Cardiff",
    "boxing gym Belfast", "boxing gym Dublin", "boxing gym Newcastle",
    "boxing gym Sheffield", "boxing gym Bristol", "boxing gym Brighton",
    "boxing gym Plymouth", "boxing gym Southampton", "boxing gym Norwich",
  ];
  return terms.map((t) => `site:instagram.com ${t}`);
}

// ---------------------------------------------------------------------------
// Region mapping
// ---------------------------------------------------------------------------
function regionFor(city: string): string {
  const c = city.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => c.includes(k));
  if (has("dublin", "cork", "limerick", "galway", "waterford")) return "Ireland";
  if (has("belfast", "derry", "lisburn", "newry", "armagh", "bangor")) return "Northern Ireland";
  if (has("edinburgh", "glasgow", "aberdeen", "dundee", "inverness", "stirling", "perth", "dunfermline", "kilmarnock", "falkirk", "motherwell", "coatbridge")) return "Scotland";
  if (has("cardiff", "swansea", "newport", "wrexham", "barry", "carmarthen", "aberystwyth")) return "Wales";
  if (has("london", "croydon", "bromley", "ealing", "hackney", "islington", "wandsworth", "camden", "greenwich", "lambeth", "lewisham", "southwark", "tower hamlets", "brighton", "southend", "slough", "watford", "st albans", "reading", "oxford", "milton keynes", "luton", "portsmouth", "southampton", "bournemouth", "poole")) return "London";
  if (has("essex", "kent", "surrey", "hertfordshire", "berkshire", "buckinghamshire", "sussex", "hampshire")) return "South East";
  if (has("bristol", "plymouth", "exeter", "torquay", "bath", "gloucester", "cheltenham", "swindon", "devon", "cornwall", "somerset", "dorset", "wiltshire", "hereford", "shrewsbury", "worcester")) return "South West";
  if (has("birmingham", "coventry", "wolverhampton", "stoke", "telford", "leicester", "nottingham", "derby", "northampton", "warwickshire")) return "Midlands";
  if (has("leeds", "sheffield", "bradford", "wakefield", "york", "hull", "doncaster", "harrogate", "yorkshire", "huddersfield", "barnsley")) return "Yorkshire";
  if (has("manchester", "liverpool", "bolton", "preston", "blackpool", "wigan", "warrington", "chester", "lancaster", "lancashire", "birkenhead", "blackburn", "burnley")) return "North West";
  if (has("newcastle", "sunderland", "middlesbrough", "teesside", "hartlepool", "durham", "tyne and wear", "cumbria")) return "North East";
  if (has("norwich", "ipswich", "cambridge", "peterborough", "norfolk", "suffolk", "lincolnshire")) return "East of England";
  return "UK";
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
  // skip pure post IDs (11 char alphanum, no _ or .)
  if (/^[a-z0-9]{10,11}$/i.test(h) && !h.includes("_") && !h.includes(".")) return null;
  return h;
}

function disciplineFromQuery(q: string): string | null {
  if (/mma/i.test(q)) return "MMA";
  if (/muay\s*thai/i.test(q)) return "Muay Thai";
  if (/boxing/i.test(q)) return "Boxing";
  return null;
}

function cityFromQuery(q: string): string | null {
  for (const c of CITIES) {
    if (new RegExp(`\\b${c.replace(/[-]/g, "\\-")}\\b`, "i").test(q)) return c;
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
  retries = 4
): Promise<{ url: string; name: string; snippet: string; host_name: string }[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await zai.functions.invoke("web_search", { query, num: 10 });
      if (Array.isArray(r)) return r as never;
      return [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = msg.includes("429");
      const is5xx = msg.includes("50") || msg.includes("5") && /status\s*5\d\d/.test(msg);
      if (attempt === retries || (!is429 && !is5xx)) {
        return [];
      }
      // exponential backoff: 3s, 6s, 12s, 24s
      const wait = 3000 * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface FoundHandle {
  handle: string;
  city: string | null;
  region: string;
  discipline: string | null;
  source: string;
  snippet: string;
  title: string;
}

interface Progress {
  doneQueries: string[];
  failedQueries: string[];
}

function loadProgress(): Progress {
  if (existsSync("/tmp/gym_progress.json")) {
    try {
      return JSON.parse(readFileSync("/tmp/gym_progress.json", "utf-8"));
    } catch {
      return { doneQueries: [], failedQueries: [] };
    }
  }
  return { doneQueries: [], failedQueries: [] };
}

function loadHandles(): Map<string, FoundHandle> {
  const m = new Map<string, FoundHandle>();
  if (existsSync("/tmp/gym_handles.json")) {
    try {
      const arr = JSON.parse(readFileSync("/tmp/gym_handles.json", "utf-8"));
      for (const h of arr) m.set(h.handle, h);
    } catch {
      // ignore
    }
  }
  return m;
}

async function main() {
  const allQueries = [...siteQueries(), ...directoryQueries(), ...cityQueries()];
  console.log(`Total queries: ${allQueries.length}`);

  const progress = loadProgress();
  const handles = loadHandles();
  const doneSet = new Set(progress.doneQueries);

  const remaining = allQueries.filter((q) => !doneSet.has(q));
  console.log(`Already done: ${doneSet.size} — remaining: ${remaining.length}`);

  const zai = await ZAI.create();

  let totalResults = 0;
  let igHits = 0;
  let batchesDone = 0;
  let processed = 0;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (q) => ({ q, results: await searchWithRetry(zai, q) }))
    );

    for (const { q, results } of batchResults) {
      progress.doneQueries.push(q);
      processed++;
      const city = cityFromQuery(q);
      const region = city ? regionFor(city) : "UK";
      const discipline = disciplineFromQuery(q);

      if (results.length === 0) {
        progress.failedQueries.push(q);
        continue;
      }
      totalResults += results.length;

      for (const r of results) {
        const url: string = r.url || "";
        const h = extractHandle(url);
        if (!h) continue;
        igHits++;
        const existing = handles.get(h);
        const snippet: string = r.snippet || "";
        const title: string = r.name || "";
        if (!existing) {
          handles.set(h, {
            handle: h,
            city,
            region,
            discipline,
            source: r.host_name || "",
            snippet: snippet.slice(0, 300),
            title: title.slice(0, 200),
          });
        } else {
          if (!existing.city && city) existing.city = city;
          if (!existing.discipline && discipline) existing.discipline = discipline;
          if (existing.region === "UK" && region !== "UK") existing.region = region;
          if (existing.snippet.length < snippet.length) {
            existing.snippet = snippet.slice(0, 300);
            existing.title = title.slice(0, 200);
          }
        }
      }
    }

    batchesDone++;
    // incremental save every batch
    writeFileSync("/tmp/gym_handles.json", JSON.stringify([...handles.values()], null, 2));
    writeFileSync(
      "/tmp/gym_progress.json",
      JSON.stringify({ ...progress, doneCount: progress.doneQueries.length }, null, 2)
    );

    if (batchesDone % 5 === 0 || batchesDone === totalBatches) {
      console.log(
        `Batch ${batchesDone}/${totalBatches} — processed ${processed}/${remaining.length} — ${handles.size} unique handles — ${progress.failedQueries.length} failed`
      );
    }

    // delay between batches
    if (i + BATCH_SIZE < remaining.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  writeFileSync("/tmp/gym_handles.json", JSON.stringify([...handles.values()], null, 2));
  writeFileSync(
    "/tmp/gym_search_meta.json",
    JSON.stringify(
      {
        totalQueries: allQueries.length,
        processedQueries: processed,
        alreadyDone: doneSet.size,
        failedQueries: progress.failedQueries.length,
        totalResults,
        igHits,
        uniqueHandles: handles.size,
      },
      null,
      2
    )
  );

  console.log(`\n=== DONE ===`);
  console.log(`Queries processed:  ${processed}`);
  console.log(`Already done:       ${doneSet.size}`);
  console.log(`Failed:             ${progress.failedQueries.length}`);
  console.log(`Total results:      ${totalResults}`);
  console.log(`IG URLs found:      ${igHits}`);
  console.log(`Unique handles:     ${handles.size}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
