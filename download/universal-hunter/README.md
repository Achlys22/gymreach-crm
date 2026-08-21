# Universal Lead Hunter

A legitimate web-search research tool that finds publicly-listed contact info
(Instagram handles, emails, phone numbers) for ANY niche in ANY location.

Built with the z-ai-web-dev-sdk. No Instagram scraping. No login bypassing.
Reads public search engine results only.

---

## What it does

1. Takes a niche + country + cities as input (via config file or command line)
2. Generates targeted web search queries (Instagram-focused + directory queries)
3. Runs searches via the z-ai SDK (legitimate research, not scraping)
4. Extracts Instagram handles, emails, and phone numbers from public results
5. Deduplicates leads
6. Outputs JSON + CSV

## What it does NOT do

- **Does NOT scrape Instagram directly** (against their ToS, gets accounts banned)
- **Does NOT hack behind logins** (only reads public search engine results)
- **Does NOT guarantee 100% accuracy** (search results can be outdated or wrong)
- **Does NOT bypass GDPR/CAN-SPAM** (you're still responsible for legal compliance)

---

## Requirements

- Node.js 18+ or Bun runtime
- The `z-ai-web-dev-sdk` package installed (`npm install z-ai-web-dev-sdk` or `bun add z-ai-web-dev-sdk`)
- A z-ai config file at one of these locations:
  - `./.z-ai-config` (current directory)
  - `~/.z-ai-config` (home directory)
  - `/etc/.z-ai-config` (system-wide)

The config file should contain:
```json
{
  "baseUrl": "https://internal-api.z.ai/v1",
  "apiKey": "Z.ai",
  "chatId": "your-chat-id",
  "token": "your-token",
  "userId": "your-user-id"
}
```

---

## Quick start

### Option 1: Use a pre-built config

```bash
# Install dependencies
bun add z-ai-web-dev-sdk

# Run with a config file
bun run scripts/universal-hunter.ts --config scripts/hunter-configs/dentists-uk.json
```

### Option 2: Command-line args

```bash
bun run scripts/universal-hunter.ts \
  --niche "plumbers" \
  --country "UK" \
  --cities "London,Manchester,Birmingham"
```

### Option 3: Run with Node

```bash
npx tsx scripts/universal-hunter.ts --config scripts/hunter-configs/dentists-uk.json
```

---

## Output

The script creates two files in `/tmp/`:

### `/tmp/universal-leads.json`
Structured data for programmatic use:
```json
[
  {
    "name": "UK Smile London",
    "instagram": "uksmiledental",
    "email": null,
    "phone": "020 7233 2323",
    "city": "London",
    "country": "UK",
    "niche": "dentists",
    "source": "www.instagram.com",
    "snippet": "UK Smile Dental - Cosmetic dentistry in London...",
    "url": "https://www.instagram.com/uksmiledental"
  }
]
```

### `/tmp/universal-leads.csv`
Spreadsheet format for manual review or import:
```csv
name,instagram,email,phone,city,country,niche,source,url
"UK Smile London","uksmiledental","","020 7233 2323","London","UK","dentists","www.instagram.com","https://..."
```

---

## Config file format

```json
{
  "niche": "dentists",
  "country": "UK",
  "cities": ["London", "Manchester", "Birmingham"],
  "extract": ["instagram", "email", "phone"],
  "languages": ["en"],
  "maxQueries": 80
}
```

| Field | Required | Description |
|---|---|---|
| `niche` | Yes | What you're hunting (dentists, plumbers, restaurants, etc.) |
| `country` | Yes | Country name (UK, Germany, USA, Spain, etc.) |
| `cities` | Yes | Array of city names to target |
| `extract` | Yes | What to extract: `["instagram", "email", "phone"]` — use any combination |
| `languages` | No | Languages to search in (default: English) |
| `maxQueries` | No | Cap on total search queries (default: 100) |

---

## Pre-built configs

Six configs are included in `scripts/hunter-configs/`:

| File | Niche | Country | Cities |
|---|---|---|---|
| `dentists-uk.json` | Dentists | UK | London, Manchester, Birmingham, Leeds, Bristol, Edinburgh, Glasgow, Brighton, Liverpool, Newcastle |
| `plumbers-uk.json` | Plumbers | UK | London, Manchester, Birmingham, Leeds, Bristol, Glasgow, Cardiff, Belfast |
| `hair-salons-uk.json` | Hair salons | UK | London, Manchester, Birmingham, Leeds, Bristol, Edinburgh, Brighton, Liverpool |
| `cafes-germany.json` | Cafes | Germany | Berlin, Munich, Hamburg, Cologne, Frankfurt, Stuttgart |
| `yoga-usa.json` | Yoga studios | USA | New York, Los Angeles, Chicago, Austin, Seattle, Miami, San Francisco, Boston |
| `restaurants-spain.json` | Restaurants | Spain | Madrid, Barcelona, Valencia, Seville, Bilbao, Malaga |

---

## Creating your own config

### Step 1: Create a JSON file

```json
{
  "niche": "barbershops",
  "country": "UK",
  "cities": ["London", "Manchester", "Birmingham", "Leeds", "Bristol"],
  "extract": ["instagram", "email", "phone"],
  "maxQueries": 60
}
```

### Step 2: Save it

Save as `scripts/hunter-configs/barbershops-uk.json` (or anywhere you want).

### Step 3: Run it

```bash
bun run scripts/universal-hunter.ts --config scripts/hunter-configs/barbershops-uk.json
```

---

## How it works (technical)

### Query generation
The script generates 3 types of queries:

1. **Instagram-focused queries**: `site:instagram.com {niche} {city} {country}`
   - These return Instagram profile URLs directly
   - Best for extracting Instagram handles

2. **Directory queries**: `best {niche} in {city} {country} contact email phone`
   - These return listicles and directory pages
   - Best for extracting emails and phone numbers

3. **Specific contact queries**: `{niche} {city} {country} email contact`
   - Targeted at finding contact information
   - Best for email/phone extraction

### Extraction logic

#### Instagram handles
- Extracted from URLs matching `instagram.com/{handle}`
- Also extracted from `@handle` mentions in snippets
- Filtered for noise (post IDs, system URLs like `/p/`, `/reel/`, etc.)

#### Emails
- Extracted using standard email regex
- Filtered for false positives (example.com, sentry.io, etc.)

#### Phone numbers
- Extracted using patterns for UK, US, and EU formats
- Minimum 10 digits required
- Filters out years, IDs, and other number-like false positives

### Deduplication
Leads are deduplicated by:
1. Instagram handle (if available)
2. Email (if available)
3. Phone number (if available)
4. Name + city (fallback)

### Rate limiting
- Queries run sequentially (not parallel) to avoid 429 errors
- 2.2 second delay between queries
- Exponential backoff on failures (3s, 6s, 12s)
- Progress saved incrementally (crash-safe)

---

## Expected yield

Per 60-80 queries, expect:

| Metric | Typical range |
|---|---|
| Unique leads | 50-200 |
| Instagram handles | 40-150 |
| Emails | 10-80 |
| Phone numbers | 20-100 |

Instagram handles are the highest-quality output. Emails/phones need manual verification.

### Verified test (dentists-uk config)
- 47 leads from 10 queries
- 40 Instagram handles
- 10 emails
- 28 phone numbers

---

## Legal considerations (READ THIS)

### UK / EU (GDPR + PECR)
- Cold **DMing** businesses on Instagram is generally fine (business accounts are public)
- Cold **emailing** scraped addresses is risky — GDPR requires consent or legitimate interest
- Cold **calling** scraped numbers is regulated by PECR (similar rules)
- **Recommendation:** Use Instagram DMs for outreach. Email/call only if the business publicly listed that contact info for inquiry purposes.

### USA (CAN-SPAM)
- Cold emailing is legal IF you include a physical address + unsubscribe link
- Still: deliverability is terrible for scraped emails (spam filters)

### Best practice
- Use this tool to find Instagram handles → DM them (lowest legal risk, highest response rate)
- Use emails/phones as secondary contact only after you've tried DMs
- Always verify a profile is active and relevant before reaching out
- Honor unsubscribe/opt-out requests immediately

### Disclaimer
This tool is for finding publicly-listed business contact information. It does not
scrape Instagram, bypass authentication, or access private data. You are responsible
for complying with all applicable laws (GDPR, CAN-SPAM, PECR) when using the data
for outreach. The authors of this tool are not responsible for how you use the output.

---

## Troubleshooting

### "z-ai-web-dev-sdk not found"
```bash
bun add z-ai-web-dev-sdk
# or
npm install z-ai-web-dev-sdk
```

### "No .z-ai-config found"
The z-ai SDK needs a config file. Create one at `~/.z-ai-config` with the
correct API credentials (see Requirements above).

### "Too many requests" (429 errors)
- The script auto-retries with backoff
- If it keeps failing, wait 10 minutes and re-run (it's resumable)
- Reduce `maxQueries` in your config

### Low yield (few leads found)
- Add more cities to the config
- Increase `maxQueries`
- Try different niche phrasings (e.g. "MMA gym" vs "martial arts gym")

### No Instagram handles found
- Some niches don't use Instagram much (e.g. plumbers, electricians)
- Try removing "instagram" from `extract` and focus on email/phone
- Add more directory queries by increasing `maxQueries`

### No emails found
- Emails are harder to extract (often not in search snippets)
- Try adding more email-specific queries in the config
- Check the snippets manually — some emails might be in the full text but not extracted

---

## File structure

```
universal-hunter/
├── README.md                          (this file)
└── scripts/
    ├── universal-hunter.ts            (main script)
    └── hunter-configs/
        ├── dentists-uk.json
        ├── plumbers-uk.json
        ├── hair-salons-uk.json
        ├── cafes-germany.json
        ├── yoga-usa.json
        └── restaurants-spain.json
```

---

## Importing results into a CRM

The JSON output can be imported into any CRM or spreadsheet. If you're using
the GymReach CRM (the Next.js app this was built for), you can write a custom
import script similar to `scripts/import-handles.ts` that reads
`/tmp/universal-leads.json` and inserts into the Prisma database.

---

## Customization

### Adding custom query types
Edit the `generateQueries()` function in `universal-hunter.ts` to add
niche-specific queries. For example, for dentists you might add:

```typescript
queries.push(`NHS dentist ${city} ${country} contact`);
queries.push(`private dentist ${city} ${country} Instagram`);
```

### Improving extraction
Edit the extraction functions (`extractInstagram`, `extractEmail`, `extractPhone`)
to add niche-specific patterns or filters.

### Output format
Edit the CSV/JSON output section at the bottom of `main()` to customize
the output fields or format.
