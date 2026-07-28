/**
 * Uses the LLM to recall UK/Ireland MMA, Muay Thai & boxing gym Instagram
 * handles from its training data. The LLM knows many real gyms — we prompt
 * it across regions & disciplines to maximise yield.
 *
 * Output: /tmp/llm_handles.json
 *
 * Usage: bun run scripts/llm-handles.ts
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

interface LlmHandle {
  handle: string;
  name: string;
  city: string;
  region: string;
  discipline: string;
}

const PROMPTS: { region: string; discipline: string; prompt: string }[] = [];

const regions = [
  "London",
  "Manchester / North West England",
  "Birmingham / Midlands",
  "Leeds / Sheffield / Yorkshire",
  "Liverpool / Merseyside",
  "Newcastle / North East England",
  "Bristol / South West England",
  "Brighton / South East England",
  "Scotland (Glasgow, Edinburgh, Aberdeen)",
  "Wales (Cardiff, Swansea, Newport)",
  "Northern Ireland (Belfast, Derry)",
  "Ireland (Dublin, Cork, Galway)",
  "Other UK cities (Nottingham, Leicester, Coventry, Hull, Plymouth, Southampton, Norwich, Cambridge, Oxford)",
];

const disciplines = ["MMA", "Muay Thai", "boxing"];

for (const region of regions) {
  for (const discipline of disciplines) {
    PROMPTS.push({
      region,
      discipline,
      prompt: `You are an expert on combat sports in the UK. List as many REAL ${discipline} gyms in ${region} (UK/Ireland) as you can, that you are confident have an Instagram account.

For each gym, output EXACTLY one line in this format (no other text, no markdown, no numbering):
HANDLE|NAME|CITY

Rules:
- HANDLE = the Instagram username WITHOUT the @ symbol, lowercase, real
- NAME = the gym's common name
- CITY = the city or town
- Only include gyms you are reasonably confident actually exist and have Instagram
- List between 15 and 40 gyms if you can
- Do NOT make up handles — if you're not sure, skip it
- Do NOT include Instagram post URLs, only profile handles
- Output ONLY the lines, no headers, no explanations

Example line:
londonfightfactory|London Fight Factory|London`,
    });
  }
}

function parseLine(line: string, region: string, discipline: string): LlmHandle | null {
  const parts = line.trim().split("|");
  if (parts.length < 3) return null;
  const handle = parts[0].replace(/^@/, "").trim().toLowerCase();
  const name = parts[1].trim();
  const city = parts[2].trim();
  if (!handle || !name || handle.length < 2) return null;
  // filter junk
  if (/^(https?|www|instagram|com|p|reel)/i.test(handle)) return null;
  if (handle.includes("/")) return null;
  if (handle.includes(".")) return null; // skip dots which are rare in gym handles
  return { handle, name, city, region, discipline };
}

async function callLLM(zai: ZAI, prompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are a combat sports expert who knows the UK MMA, Muay Thai and boxing gym scene intimately. You output structured data only.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      return completion.choices[0]?.message?.content || "";
    } catch (e) {
      if (attempt === retries) return "";
      await new Promise((r) => setTimeout(r, 3000 * Math.pow(2, attempt)));
    }
  }
  return "";
}

async function main() {
  const zai = await ZAI.create();
  const handles = new Map<string, LlmHandle>();

  // load existing
  if (existsSync("/tmp/llm_handles.json")) {
    try {
      const existing = JSON.parse(readFileSync("/tmp/llm_handles.json", "utf-8"));
      for (const h of existing) handles.set(h.handle, h);
    } catch {
      // ignore
    }
  }

  console.log(`Running ${PROMPTS.length} LLM prompts (sequential, 2s delay)...`);

  for (let i = 0; i < PROMPTS.length; i++) {
    const { region, discipline, prompt } = PROMPTS[i];
    const before = handles.size;
    const text = await callLLM(zai, prompt);
    const lines = text.split("\n");
    let count = 0;
    for (const line of lines) {
      const parsed = parseLine(line, region, discipline);
      if (parsed && !handles.has(parsed.handle)) {
        handles.set(parsed.handle, parsed);
        count++;
      } else if (parsed) {
        // enrich existing
        const ex = handles.get(parsed.handle);
        if (ex && !ex.discipline.includes(discipline)) {
          ex.discipline = `${ex.discipline},${discipline}`;
        }
      }
    }
    console.log(
      `[${i + 1}/${PROMPTS.length}] ${region} / ${discipline} → +${count} new (total ${handles.size})`
    );
    writeFileSync("/tmp/llm_handles.json", JSON.stringify([...handles.values()], null, 2));
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total LLM-sourced handles: ${handles.size}`);
  writeFileSync("/tmp/llm_handles.json", JSON.stringify([...handles.values()], null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
