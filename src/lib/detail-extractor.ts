/**
 * Detail extractor.
 *
 * Parses a lead's notes/snippet text to find ONE specific, non-generic
 * detail that can be used in Line 1 of a cold DM. If no specific detail
 * is found, returns null (and the template should output "SKIP").
 *
 * What counts as "specific":
 *   - Named dishes (pizza, paella, ramen, etc.)
 *   - Class/program types (kids BJJ, no-gi, beginners Muay Thai)
 *   - Named people (Head Coach Brad, owner Sarah)
 *   - Awards/achievements (UFC fighters, world champions, 3x champion)
 *   - Specific facilities (2 boxing rings, octagon, 12,000 sq ft)
 *   - Review phrases in quotes ("best curry in town")
 *
 * What does NOT count (generic filler):
 *   - "great food", "looks good", "standout", "impressive"
 *   - Just the category (e.g. "MMA gym", "Italian restaurant")
 *   - City names alone
 *   - "accepting new members", "all levels welcome"
 */

const DISHES = [
  "pizza", "pasta", "ramen", "sushi", "paella", "curry", "biryani",
  "burger", "steak", "taco", "tapas", "dim sum", "pho", "noodle",
  "dumpling", "ribs", "wings", "brisket", "katsu", "tempura",
  "risotto", "gnocchi", "carbonara", "tagliatelle", "lasagne",
  "pad thai", "massaman", "thai green", "rendang", "nasi goreng",
  "falafel", "shawarma", "kebab", "mezze",
  "brunch", "roast", "full english", "eggs benedict",
];

const PROGRAMS = [
  "kids classes", "kids mma", "kids bjj", "kids boxing",
  "beginners", "no-gi", "no gi", "gi bjj",
  "wrestling", "striking", "grappling",
  "muay thai", "boxing", "bjj", "mma",
  "pro team", "fight team", "competition team",
  "women's only", "womens only", "ladies only",
  "personal training", "1-2-1", "1 to 1", "private tuition",
  "strength and conditioning", "s&c",
];

const AWARDS = [
  "ufc", "bellator", "pfl", "one championship", "cagewarriors",
  "world champion", "champion", "title holder",
  "undefeated", "pro fighter", "professional fighter",
];

const FACILITIES = [
  "boxing ring", "octagon", "cage", "full cage",
  "zebra mat", "tatami", "swimming pool", "pool",
  "sauna", "steam room", "jacuzzi",
  "bar", "cocktail bar", "wine cellar", "terrace", "garden",
  "private dining", "chef's table",
];

const FILLER_PHRASES = [
  "standout", "caught my eye", "looks great", "really impressive",
  "doing things right", "proper place", "solid spot", "real standout",
  "genuinely impressive", "next level", "unreal",
];

interface ExtractedDetail {
  detail: string;
  source: string; // what category it came from
}

/**
 * Extracts a specific detail from the notes text.
 * Returns null if no specific detail is found.
 */
export function extractDetail(notes: string | null, name: string): ExtractedDetail | null {
  if (!notes) return null;

  // Clean up import prefixes
  const text = notes
    .replace(/^\[Verified via web search\]\s*/i, "")
    .replace(/^\[LLM-suggested[^\]]*\]\s*/i, "")
    .replace(/^\[Auto-imported[^\]]*\]\s*/i, "")
    .replace(/^\[.*?\]\s*/i, "")
    .trim();

  if (!text || text.length < 10) return null;

  const lower = text.toLowerCase();

  // 1. Check for named people (Head Coach X, owner X, founded by X)
  const personMatch = text.match(/(?:head coach|owner|founded by|run by|coach)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (personMatch) {
    return {
      detail: `coach ${personMatch[1]}`,
      source: "person",
    };
  }

  // 2. Check for awards/achievements
  for (const award of AWARDS) {
    if (lower.includes(award)) {
      if (award === "ufc" || award === "bellator" || award === "pfl" || award === "one championship" || award === "cagewarriors") {
        return { detail: `home to ${award.toUpperCase()} fighters`, source: "award" };
      }
      if (award === "world champion") {
        return { detail: "world champion fighters", source: "award" };
      }
      if (award === "champion" && !lower.includes("world champion")) {
        return { detail: "champion-level coaching", source: "award" };
      }
      if (award === "pro fighter" || award === "professional fighter") {
        return { detail: "pro fighters training there", source: "award" };
      }
    }
  }

  // 3. Check for specific facilities
  for (const facility of FACILITIES) {
    if (lower.includes(facility)) {
      if (facility === "boxing ring") {
        const ringCount = text.match(/(\d+)\s+(?:x\s+)?boxing\s+ring/i);
        if (ringCount) return { detail: `${ringCount[1]} boxing rings`, source: "facility" };
        return { detail: "a proper boxing ring", source: "facility" };
      }
      if (facility === "octagon" || facility === "cage" || facility === "full cage") {
        return { detail: "a full MMA cage", source: "facility" };
      }
      if (facility === "chef's table") {
        return { detail: "a chef's table", source: "facility" };
      }
      if (facility === "private dining") {
        return { detail: "private dining", source: "facility" };
      }
      if (facility === "terrace" || facility === "garden") {
        return { detail: `a ${facility}`, source: "facility" };
      }
      return { detail: facility, source: "facility" };
    }
  }

  // 4. Check for specific dishes (restaurants)
  for (const dish of DISHES) {
    if (lower.includes(dish)) {
      return { detail: `the ${dish}`, source: "dish" };
    }
  }

  // 5. Check for specific programs/classes (gyms)
  for (const program of PROGRAMS) {
    if (lower.includes(program)) {
      return { detail: `their ${program} program`, source: "program" };
    }
  }

  // 6. Check for review quotes (text in quotation marks)
  const quoteMatch = text.match(/[""]([^""]{5,60})["""]/);
  if (quoteMatch && quoteMatch[1].trim().length > 5) {
    const quote = quoteMatch[1].trim().toLowerCase();
    // Make sure it's not a filler phrase
    if (!FILLER_PHRASES.some((f) => quote.includes(f))) {
      return { detail: `reviewers say "${quote}"`, source: "review" };
    }
  }

  // 7. Check for size/scale mentions (12,000 sq ft, 3,000 sq ft)
  const sizeMatch = text.match(/(\d[\d,]+)\s*(?:sq\s*ft|square\s*feet|sqft)/i);
  if (sizeMatch) {
    return { detail: `a ${sizeMatch[1]} sq ft facility`, source: "size" };
  }

  // 8. Check for "est." / "founded" / "since" (longevity)
  const foundedMatch = text.match(/(?:est\.?\s*(?:19|20)\d{2}|founded\s*(?:in\s*)?(?:19|20)\d{2}|since\s*(?:19|20)\d{2})/i);
  if (foundedMatch) {
    return { detail: `around since ${foundedMatch[0]}`, source: "longevity" };
  }

  // No specific detail found
  return null;
}

/**
 * Builds Line 1 using a specific detail.
 * Returns a natural-sounding hook that could ONLY apply to this business.
 *
 * The detail might already include "their" (e.g. "their kids BJJ program")
 * or be a standalone noun phrase (e.g. "the paella", "2 boxing rings").
 * We normalize to avoid "their their..." duplication.
 */
export function buildHookWithDetail(name: string, detail: string, type: "gym" | "restaurant"): string {
  // Normalize: strip leading "their" / "the" / "a" if present (we add our own)
  let d = detail.trim().toLowerCase();
  d = d.replace(/^(their|the|a|an)\s+/i, "");

  const variants = [
    `Saw ${name}'s ${d}. Looked great.`,
    `${name}'s ${d} caught my attention.`,
    `Been checking out ${name}. The ${d} stood out.`,
    `${name} came up. Their ${d} looks legit.`,
    `Saw ${name}. The ${d} is impressive.`,
    `Came across ${name}. Their ${d} stood out.`,
  ];

  // Deterministic pick based on name for consistency
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % variants.length;
  return variants[idx];
}
