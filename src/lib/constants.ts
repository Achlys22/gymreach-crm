export const LEAD_STATUSES = [
  "new",
  "contacted",
  "replied",
  "interested",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["low", "medium", "high"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const REGIONS = [
  "London",
  "South East",
  "South West",
  "Midlands",
  "Yorkshire",
  "North West",
  "North East",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "Ireland",
] as const;

export const COUNTRIES = [
  "UK",
  "Denmark",
  "Norway",
  "Sweden",
] as const;

export const DISCIPLINES = ["MMA", "Muay Thai", "Boxing", "BJJ", "Kickboxing", "Wrestling"] as const;

export const STATUS_META: Record<
  LeadStatus,
  { label: string; color: string; badge: string }
> = {
  new: {
    label: "New",
    color: "text-slate-600",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  contacted: {
    label: "Contacted",
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  replied: {
    label: "Replied",
    color: "text-sky-600",
    badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  },
  interested: {
    label: "Interested",
    color: "text-violet-600",
    badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  },
  won: {
    label: "Won",
    color: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  lost: {
    label: "Lost",
    color: "text-rose-600",
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  },
};

export const PRIORITY_META: Record<LeadPriority, { label: string; badge: string }> = {
  low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  medium: {
    label: "Medium",
    badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  },
  high: {
    label: "High",
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
};
