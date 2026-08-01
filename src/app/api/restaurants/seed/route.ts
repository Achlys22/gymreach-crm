import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Seed a few sample restaurants so the workspace isn't empty on first load
const SAMPLE_RESTAURANTS = [
  { name: "The Olive Branch", city: "London", region: "London", cuisine: "Mediterranean", hasWebsite: true, reservationSystem: "OpenTable", priority: "medium" },
  { name: "Spice Route", city: "Birmingham", region: "Midlands", cuisine: "Indian", hasWebsite: true, reservationSystem: "Bookatable", priority: "medium" },
  { name: "Nonna's Kitchen", city: "Leeds", region: "Yorkshire", cuisine: "Italian", hasWebsite: false, reservationSystem: "None", priority: "high" },
  { name: "The Smithfield Pub", city: "London", region: "London", cuisine: "Pub", hasWebsite: false, reservationSystem: "None", priority: "high" },
  { name: "Sakura Sushi", city: "Manchester", region: "North West", cuisine: "Japanese", hasWebsite: true, reservationSystem: "Resy", priority: "medium" },
  { name: "Bangkok Street", city: "Bristol", region: "South West", cuisine: "Thai", hasWebsite: false, reservationSystem: "None", priority: "high" },
  { name: "The Grill House", city: "Glasgow", region: "Scotland", cuisine: "Steakhouse", hasWebsite: true, reservationSystem: "SevenRooms", priority: "medium" },
  { name: "Cafe Rouge", city: "Brighton", region: "South East", cuisine: "French", hasWebsite: true, reservationSystem: "TheFork", priority: "low" },
  { name: "El Toro", city: "Liverpool", region: "North West", cuisine: "Spanish", hasWebsite: false, reservationSystem: "None", priority: "high" },
  { name: "Green Garden", city: "Edinburgh", region: "Scotland", cuisine: "Vegan/Veggie", hasWebsite: false, reservationSystem: "None", priority: "medium" },
];

export async function POST() {
  try {
    let inserted = 0;
    let skipped = 0;

    for (const r of SAMPLE_RESTAURANTS) {
      // Check by name + city to avoid duplicates
      const existing = await db.restaurantLead.findFirst({
        where: { name: r.name, city: r.city },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await db.restaurantLead.create({
        data: {
          ...r,
          status: "new",
          notes: "Sample restaurant lead. Replace with real data from your research.",
        },
      });
      inserted++;
    }

    const total = await db.restaurantLead.count();
    return NextResponse.json({ inserted, skipped, total });
  } catch (e) {
    console.error("POST /api/restaurants/seed error", e);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
