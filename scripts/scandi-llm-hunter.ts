/**
 * LLM-only Scandinavian gym handle recall.
 * Supplements the web search results.
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, readFileSync, existsSync } from "fs";

const PROMPTS: { country: string; prompt: string }[] = [
  { country: "Denmark", prompt: "List 40 REAL MMA, Muay Thai, boxing, BJJ and kickboxing gyms in Denmark that have Instagram accounts. Include Copenhagen, Aarhus, Odense, Aalborg and other cities. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @ in handle. Only real gyms." },
  { country: "Denmark", prompt: "List 40 MORE real martial arts gyms in Denmark (different from before) with Instagram. MMA, Muay Thai, boxing, BJJ. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Denmark", prompt: "List 30 real boxing and Muay Thai gyms in Copenhagen Denmark with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Denmark", prompt: "List 30 real MMA and BJJ gyms in Aarhus and Odense Denmark with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Norway", prompt: "List 40 REAL MMA, Muay Thai, boxing, BJJ and kickboxing gyms in Norway that have Instagram accounts. Include Oslo, Bergen, Trondheim, Stavanger and other cities. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @ in handle. Only real gyms." },
  { country: "Norway", prompt: "List 40 MORE real martial arts gyms in Norway (different from before) with Instagram. MMA, Muay Thai, boxing, BJJ. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Norway", prompt: "List 30 real boxing and Muay Thai gyms in Oslo Norway with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Norway", prompt: "List 30 real MMA and BJJ gyms in Bergen and Trondheim Norway with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Sweden", prompt: "List 40 REAL MMA, Muay Thai, boxing, BJJ and kickboxing gyms in Sweden that have Instagram accounts. Include Stockholm, Gothenburg, Malmo and other cities. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @ in handle. Only real gyms." },
  { country: "Sweden", prompt: "List 40 MORE real martial arts gyms in Sweden (different from before) with Instagram. MMA, Muay Thai, boxing, BJJ. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Sweden", prompt: "List 30 real boxing and Muay Thai gyms in Stockholm Sweden with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Sweden", prompt: "List 30 real MMA and BJJ gyms in Gothenburg and Malmo Sweden with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Sweden", prompt: "List 30 more martial arts gyms in Uppsala, Vasteras, Orebro Sweden with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Denmark", prompt: "List 30 more martial arts gyms in smaller Danish cities (Aalborg, Esbjerg, Randers, Kolding, Vejle, Roskilde) with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
  { country: "Norway", prompt: "List 30 more martial arts gyms in smaller Norwegian cities (Drammen, Fredrikstad, Kristiansand, Tromso, Sandnes) with Instagram. One per line: HANDLE|NAME|CITY|DISCIPLINE. No @." },
];

function parseLlmLine(line: string, country: string) {
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

async function main() {
  const zai = await ZAI.create();
  const leads = new Map<string, any>();

  // Load existing
  if (existsSync("/tmp/scandi_gym_leads.json")) {
    try {
      const existing = JSON.parse(readFileSync("/tmp/scandi_gym_leads.json", "utf-8"));
      for (const h of existing) leads.set(h.handle, h);
    } catch {}
  }
  console.log(`Starting with ${leads.size} existing leads`);

  for (let i = 0; i < PROMPTS.length; i++) {
    const { country, prompt } = PROMPTS[i];
    console.log(`[${i + 1}/${PROMPTS.length}] ${country}...`);
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are a Scandinavian martial arts scene expert. Output structured data only, one per line." },
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
            country,
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

  // Stats
  const byCountry: Record<string, number> = {};
  for (const lead of leads.values()) {
    byCountry[lead.country] = (byCountry[lead.country] || 0) + 1;
  }
  console.log("\n=== DONE ===");
  console.log(`Total: ${leads.size}`);
  for (const c of ["Denmark", "Norway", "Sweden"]) {
    console.log(`  ${c}: ${byCountry[c] || 0}`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
