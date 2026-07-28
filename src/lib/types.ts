export interface GymLead {
  id: string;
  name: string;
  instagram: string;
  city: string | null;
  region: string | null;
  disciplines: string;
  status: string;
  priority: string;
  notes: string | null;
  followUpAt: string | null;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  byRegion: Record<string, number>;
  byPriority: Record<string, number>;
}
