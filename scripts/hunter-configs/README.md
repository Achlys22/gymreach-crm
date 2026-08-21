# Universal Lead Hunter

A legitimate web-search research tool that finds publicly-listed contact info
(Instagram handles, emails, phone numbers) for ANY niche in ANY location.

## What this does

- Runs targeted web searches (Google/Bing via z-ai SDK)
- Extracts Instagram handles, emails, and phone numbers from **public search results**
- Deduplicates leads
- Outputs JSON + CSV

## What this does NOT do

- **Does NOT scrape Instagram directly** (against their ToS, gets accounts banned)
- **Does NOT hack behind logins** (only reads public search engine results)
- **Does NOT guarantee 100% accuracy** — search results can be outdated or wrong
- **Does NOT bypass GDPR/CAN-SPAM** — you're still responsible for legal compliance

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

## Usage

### Option 1: Use a config file

```bash
bun run scripts/universal-hunter.ts --config scripts/hunter-configs/dentists-uk.json
```

### Option 2: Command-line args

```bash
bun run scripts/universal-hunter.ts \
  --niche "plumbers" \
  --country "UK" \
  --cities "London,Manchester,Birmingham"
```

### Output

- `/tmp/universal-leads.json` — structured data (for import into CRM)
- `/tmp/universal-leads.csv` — spreadsheet format (for manual review)

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
| `country` | Yes | Country name or code (UK, Germany, USA, Spain) |
| `cities` | Yes | Array of city names to target |
| `extract` | Yes | What to extract: `["instagram", "email", "phone"]` |
| `languages` | No | Languages to search in (default: English) |
| `maxQueries` | No | Cap on total search queries (default: 100) |

## Example configs (already included)

| File | Niche | Country |
|---|---|---|
| `dentists-uk.json` | Dentists | UK |
| `plumbers-uk.json` | Plumbers | UK |
| `hair-salons-uk.json` | Hair salons | UK |
| `cafes-germany.json` | Cafes | Germany |
| `yoga-usa.json` | Yoga studios | USA |
| `restaurants-spain.json` | Restaurants | Spain |

## Creating your own config

1. Copy an existing config file
2. Edit the niche, country, and cities
3. Run it

Example for UK barbershops:
```json
{
  "niche": "barbershops",
  "country": "UK",
  "cities": ["London", "Manchester", "Birmingham", "Leeds", "Bristol"],
  "extract": ["instagram", "email", "phone"],
  "maxQueries": 60
}
```

Save as `scripts/hunter-configs/barbershops-uk.json` and run:
```bash
bun run scripts/universal-hunter.ts --config scripts/hunter-configs/barbershops-uk.json
```

## Importing results into the CRM

The hunter outputs JSON. To import gym leads into the CRM:

```bash
# After running the hunter with niche "MMA gyms"
bun run scripts/import-universal-to-gym.ts
```

(Run import script after the hunter finishes — it reads /tmp/universal-leads.json)

## Rate limits

The z-ai web search API has rate limits (~1 request per 2 seconds). For 80 queries,
expect the hunt to take ~3-4 minutes. The script:
- Runs queries sequentially (not parallel) to avoid 429 errors
- Retries failed queries with exponential backoff
- Saves progress incrementally (crash-safe)

## Expected yield

Per 60-80 queries, expect:
- 50-200 unique Instagram handles
- 20-80 emails (lower quality — many filtered as false positives)
- 30-100 phone numbers

Instagram handles are the highest-quality output. Emails/phones need manual verification.

## Troubleshooting

### "Too many requests" (429 errors)
- The script auto-retries with backoff
- If it keeps failing, wait 10 minutes and re-run (it's resumable)

### Low yield
- Add more cities to the config
- Increase `maxQueries`
- Try different niche phrasings (e.g. "MMA gym" vs "martial arts gym")

### No Instagram handles found
- Some niches don't use Instagram much (e.g. plumbers)
- Try removing "instagram" from `extract` and focus on email/phone
- Add more directory queries to the config
