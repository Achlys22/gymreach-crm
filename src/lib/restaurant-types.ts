export interface RestaurantLead {
  id: string;
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  cuisine: string | null;
  hasWebsite: boolean;
  reservationSystem: string | null;
  botDeployed: boolean;
  status: string;
  priority: string;
  notes: string | null;
  detail: string | null;
  message: string | null;
  followUpAt: string | null;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantStats {
  total: number;
  byStatus: Record<string, number>;
  byRegion: Record<string, number>;
  byPriority: Record<string, number>;
}
