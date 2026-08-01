/**
 * LLM-only restaurant handle recall.
 * Fast — no web search rate limits. Supplements the hunter results.
 *
 * Usage: bun run scripts/llm-restaurant-handles.ts
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

interface Handle {
  handle: string;
  name: string;
  city: string;
  cuisine: string;
}

const PROMPTS: { region: string; q: string }[] = [
  { region: "Manchester", q: "List 30 REAL independent restaurants in Manchester, UK with Instagram accounts. One per line: HANDLE|NAME|CUISINE. No @ in handle. Only real restaurants you're confident about." },
  { region: "Manchester", q: "List 30 MORE real restaurants in Manchester UK (different from before) with Instagram. One per line: HANDLE|NAME|CUISINE. No @. Include pubs, cafes, fine dining." },
  { region: "Bristol", q: "List 30 REAL independent restaurants in Bristol, UK with Instagram accounts. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Leeds", q: "List 30 REAL independent restaurants in Leeds, UK with Instagram accounts. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Birmingham", q: "List 30 REAL independent restaurants in Birmingham, UK with Instagram accounts. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "London", q: "List 50 REAL independent restaurants in London, UK with Instagram accounts. Mix of areas (Shoreditch, Soho, Brixton, etc). One per line: HANDLE|NAME|CUISINE. No @." },
  { region: "London", q: "List 50 MORE real restaurants in London UK (different from before) with Instagram. One per line: HANDLE|NAME|CUISINE. No @. Include different cuisines." },
  { region: "Edinburgh", q: "List 25 REAL independent restaurants in Edinburgh, Scotland with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Glasgow", q: "List 25 REAL independent restaurants in Glasgow, Scotland with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Brighton", q: "List 25 REAL independent restaurants in Brighton, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Liverpool", q: "List 25 REAL independent restaurants in Liverpool, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Sheffield", q: "List 20 REAL independent restaurants in Sheffield, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Nottingham", q: "List 20 REAL independent restaurants in Nottingham, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Cardiff", q: "List 20 REAL independent restaurants in Cardiff, Wales with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Newcastle", q: "List 20 REAL independent restaurants in Newcastle, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Bath", q: "List 15 REAL independent restaurants in Bath, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Oxford", q: "List 15 REAL independent restaurants in Oxford, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "York", q: "List 15 REAL independent restaurants in York, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Cambridge", q: "List 15 REAL independent restaurants in Cambridge, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
  { region: "Exeter", q: "List 15 REAL independent restaurants in Exeter, UK with Instagram. One per line: HANDLE|NAME|CUISINE. No @ in handle." },
];

async function main() {
  const zai = await ZAI.create();

  // Load existing
  const handles = new Map<string, Handle>();
  if (existsSync("/tmp/restaurant_llm_handles.json")) {
    try {
      const existing = JSON.parse(readFileSync("/tmp/restaurant_llm_handles.json", "utf-8"));
      for (const h of existing) handles.set(h.handle, h);
    } catch {}
  }

  console.log(`Starting with ${handles.size} existing LLM handles`);

  for (let i = 0; i < PROMPTS.length; i++) {
    const { region, q } = PROMPTS[i];
    console.log(`[${i + 1}/${PROMPTS.length}] ${region}...`);
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are a UK food scene expert. Output structured data only, one per line." },
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
        const cuisine = parts[2]?.trim() || "";
        if (!handle || !name || handle.length < 2) continue;
        if (handle.includes("/") || handle.includes(".") || handle.includes(" ")) continue;
        if (/^(https?|www|instagram|com|p|reel)/i.test(handle)) continue;
        if (!handles.has(handle)) {
          handles.set(handle, { handle, name, city: region, cuisine });
          count++;
        }
      }
      console.log(`  +${count} new (${handles.size} total)`);
    } catch (e) {
      console.log(`  FAILED: ${e instanceof Error ? e.message : "error"}`);
    }
    writeFileSync("/tmp/restaurant_llm_handles.json", JSON.stringify([...handles.values()], null, 2));
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n=== DONE: ${handles.size} LLM restaurant handles ===`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
