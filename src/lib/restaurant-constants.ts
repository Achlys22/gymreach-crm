// Restaurant-specific constants

export const RESTAURANT_STATUSES = [
  "new",
  "contacted",
  "demo_sent",
  "interested",
  "won",
  "lost",
] as const;

export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

export const RESTAURANT_STATUS_META: Record<
  RestaurantStatus,
  { label: string; badge: string }
> = {
  new: {
    label: "New",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  contacted: {
    label: "Contacted",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  demo_sent: {
    label: "Demo Sent",
    badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  },
  interested: {
    label: "Interested",
    badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  },
  won: {
    label: "Won",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  lost: {
    label: "Lost",
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  },
};

export const CUISINES = [
  "Italian", "Indian", "Chinese", "Thai", "Japanese", "Mexican",
  "Fine Dining", "Modern British", "Pub", "Cafe", "Street Food",
  "Mediterranean", "French", "Spanish", "Korean", "Vietnamese",
  "Middle Eastern", "Caribbean", "Steakhouse", "Seafood", "Vegan/Veggie",
  "Other",
] as const;

export const RESERVATION_SYSTEMS = [
  "OpenTable", "Resy", "TheFork", "SevenRooms", "Bookatable",
  "EazyBookings", "Custom/Own", "None",
] as const;
