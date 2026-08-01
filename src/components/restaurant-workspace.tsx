"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Instagram,
  MapPin,
  Loader2,
  Sparkles,
  Download,
  Pencil,
  Trash2,
  ExternalLink,
  UtensilsCrossed,
  Users,
  MessageSquare,
  Trophy,
  Send,
  X,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MessageCircle,
  Copy,
  Check,
  Wand2,
  Bot,
  Phone,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  RESTAURANT_STATUSES,
  RESTAURANT_STATUS_META,
  CUISINES,
  RESERVATION_SYSTEMS,
  type RestaurantStatus,
} from "@/lib/restaurant-constants";
import type { RestaurantLead, RestaurantStats } from "@/lib/restaurant-types";
import {
  REGIONS,
  LEAD_PRIORITIES,
  PRIORITY_META,
  type LeadPriority,
} from "@/lib/constants";

export interface RestaurantWorkspaceProps {
  bulkGenerating: boolean;
  onBulkGenerate: () => void;
}

export default function RestaurantWorkspace({
  bulkGenerating,
  onBulkGenerate,
}: RestaurantWorkspaceProps) {
  const { toast } = useToast();

  const [leads, setLeads] = useState<RestaurantLead[]>([]);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // add/edit dialog
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantLead | null>(null);

  // message dialog
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageLead, setMessageLead] = useState<RestaurantLead | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // verified-only filter (medium/high priority = verified, low = needs verification)
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // track bulk generate transitions so we can refresh after the parent finishes
  const prevBulk = useRef(bulkGenerating);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (regionFilter !== "all") params.set("region", regionFilter);
      if (cuisineFilter !== "all") params.set("cuisine", cuisineFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const res = await fetch(`/api/restaurants?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load restaurants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, regionFilter, cuisineFilter, priorityFilter, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/restaurants/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (prevBulk.current && !bulkGenerating) {
      // just finished a bulk run, refresh data
      fetchLeads();
      fetchStats();
    }
    prevBulk.current = bulkGenerating;
  }, [bulkGenerating, fetchLeads, fetchStats]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, leads.length]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/restaurants/seed", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Seed complete",
        description: `Inserted ${data.inserted}. Skipped ${data.skipped} (already existed). Total ${data.total}.`,
      });
      fetchLeads();
      fetchStats();
    } catch (e) {
      toast({
        title: "Seed failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Status updated",
        description: `Marked as ${RESTAURANT_STATUS_META[status as RestaurantStatus]?.label}`,
      });
      fetchStats();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      fetchLeads();
    }
  };

  const updatePriority = async (id: string, priority: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, priority } : l))
    );
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch {
      fetchLeads();
    }
  };

  const deleteLead = async (id: string, name: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Restaurant deleted", description: name });
      fetchStats();
    } catch {
      fetchLeads();
    }
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "instagram",
      "phone",
      "city",
      "region",
      "cuisine",
      "hasWebsite",
      "reservationSystem",
      "botDeployed",
      "status",
      "priority",
      "notes",
      "contactedAt",
      "followUpAt",
    ];
    const rows = leads.map((l) =>
      [
        l.name,
        l.instagram ? "@" + l.instagram : "",
        l.phone ?? "",
        l.city ?? "",
        l.region ?? "",
        l.cuisine ?? "",
        l.hasWebsite ? "yes" : "no",
        l.reservationSystem ?? "",
        l.botDeployed ? "yes" : "no",
        l.status,
        l.priority,
        (l.notes ?? "").replace(/"/g, '""'),
        l.contactedAt ?? "",
        l.followUpAt ?? "",
      ]
        .map((v) => `"${String(v)}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uk-restaurant-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${leads.length} restaurants to CSV` });
  };

  const clearFilters = () => {
    setQ("");
    setStatusFilter("all");
    setRegionFilter("all");
    setCuisineFilter("all");
    setPriorityFilter("all");
    setVerifiedOnly(false);
    setPage(1);
  };

  const hasFilters =
    q ||
    statusFilter !== "all" ||
    regionFilter !== "all" ||
    cuisineFilter !== "all" ||
    priorityFilter !== "all" ||
    verifiedOnly;

  // apply verified-only filter client-side (medium/high priority = verified)
  const displayLeads = useMemo(() => {
    if (!verifiedOnly) return leads;
    return leads.filter(
      (l) => l.priority === "medium" || l.priority === "high"
    );
  }, [leads, verifiedOnly]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(displayLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLeads = displayLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, regionFilter, cuisineFilter, priorityFilter, verifiedOnly]);

  // derived stats for sub-text
  const demoSentCount = stats?.byStatus.demo_sent ?? 0;
  const wonCount = stats?.byStatus.won ?? 0;
  const contactedCount = stats?.byStatus.contacted ?? 0;
  const responseRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    const contacted =
      (stats.byStatus.contacted ?? 0) +
      (stats.byStatus.demo_sent ?? 0) +
      (stats.byStatus.interested ?? 0) +
      (stats.byStatus.won ?? 0) +
      (stats.byStatus.lost ?? 0);
    const responded =
      (stats.byStatus.interested ?? 0) + (stats.byStatus.won ?? 0);
    if (contacted === 0) return 0;
    return Math.round((responded / contacted) * 100);
  }, [stats]);

  const winRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round(((stats.byStatus.won ?? 0) / stats.total) * 100);
  }, [stats]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <UtensilsCrossed className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                DineReach. UK Restaurant Outreach CRM
              </h1>
              <p className="text-xs text-muted-foreground">
                Cold outreach pipeline for Instagram-friendly restaurants, pubs &amp; cafés
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Load sample restaurants
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkGenerate}
              disabled={bulkGenerating}
              title="Generate personalized DMs for restaurants missing one (max 50 per batch)"
            >
              {bulkGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              <span className="hidden sm:inline">Generate DMs</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setAddOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add restaurant
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Users className="size-4" />}
            label="Total restaurants"
            value={stats?.total ?? 0}
            sub={`${(stats?.byPriority.medium ?? 0) + (stats?.byPriority.high ?? 0)} verified`}
            accent="from-emerald-500 to-teal-500"
          />
          <StatCard
            icon={<MessageSquare className="size-4" />}
            label="Contacted"
            value={contactedCount}
            sub={`${responseRate}% response rate`}
            accent="from-sky-500 to-cyan-600"
          />
          <StatCard
            icon={<Send className="size-4" />}
            label="Demo Sent"
            value={demoSentCount}
            sub="AI bot demos shared"
            accent="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={<Trophy className="size-4" />}
            label="Won"
            value={wonCount}
            sub={`${winRate}% win rate`}
            accent="from-violet-500 to-fuchsia-600"
          />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurant name, @handle or city."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {RESTAURANT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {RESTAURANT_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cuisines</SelectItem>
                    {CUISINES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full md:w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priority</SelectItem>
                    {LEAD_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={verifiedOnly}
                    onCheckedChange={(v) => setVerifiedOnly(v === true)}
                  />
                  <span className="text-xs font-medium">Verified only</span>
                </label>
                {hasFilters ? (
                  <>
                    <Badge variant="secondary">{displayLeads.length} match</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      <X className="size-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <span className="hidden sm:inline">No filters applied. Showing all restaurants.</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={leads.length === 0}
              >
                <Download className="size-4" />
                Export CSV ({leads.length})
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayLeads.length === 0 ? (
            <EmptyState
              onSeed={handleSeed}
              onAdd={() => {
                setEditing(null);
                setAddOpen(true);
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                      <TableHead className="min-w-[220px]">Restaurant</TableHead>
                      <TableHead className="min-w-[140px]">Location</TableHead>
                      <TableHead className="min-w-[120px]">Cuisine</TableHead>
                      <TableHead className="min-w-[140px]">Reservation</TableHead>
                      <TableHead className="min-w-[110px]">Bot</TableHead>
                      <TableHead className="min-w-[120px]">Priority</TableHead>
                      <TableHead className="min-w-[150px]">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        onStatusChange={(s) => updateStatus(lead.id, s)}
                        onPriorityChange={(p) => updatePriority(lead.id, p)}
                        onEdit={() => {
                          setEditing(lead);
                          setAddOpen(true);
                        }}
                        onDelete={() => deleteLead(lead.id, lead.name)}
                        onMessage={() => {
                          setMessageLead(lead);
                          setMessageOpen(true);
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2">
                <div className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * PAGE_SIZE, displayLeads.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {displayLeads.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8"
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-950 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            DineReach CRM. {stats?.total ?? 0} restaurants tracked.{" "}
            {(stats?.byPriority.medium ?? 0) + (stats?.byPriority.high ?? 0)} verified.{" "}
            {stats?.byPriority.low ?? 0} to verify.
          </p>
          <p className="flex items-center gap-1.5">
            <Instagram className="size-3.5" />
            Always verify a profile is active &amp; UK-based before outreach
          </p>
        </div>
      </footer>

      {/* Add/Edit dialog */}
      <LeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editing={editing}
        onSaved={() => {
          fetchLeads();
          fetchStats();
        }}
      />

      {/* Message dialog */}
      <MessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        lead={messageLead}
        onUpdated={(updated) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          );
        }}
      />
    </div>
  );
}

/* ---------- Stat card ---------- */
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div
        className={`absolute -right-4 -top-4 size-16 rounded-full bg-gradient-to-br ${accent} opacity-10`}
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <div
          className={`size-7 rounded-lg bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}
        >
          {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

/* ---------- Lead row ---------- */
function LeadRow({
  lead,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onDelete,
  onMessage,
}: {
  lead: RestaurantLead;
  onStatusChange: (s: string) => void;
  onPriorityChange: (p: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
}) {
  const statusBadge =
    RESTAURANT_STATUS_META[lead.status as RestaurantStatus] ??
    RESTAURANT_STATUS_META.new;
  const priorityBadge =
    PRIORITY_META[lead.priority as LeadPriority] ?? PRIORITY_META.medium;
  const hasInstagram = !!lead.instagram;

  return (
    <TableRow className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate flex items-center gap-1.5">
              {lead.name}
              {(lead.priority === "medium" || lead.priority === "high") && (
                <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            {hasInstagram ? (
              <a
                href={`https://instagram.com/${lead.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-emerald-600 inline-flex items-center gap-1"
              >
                @{lead.instagram}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Phone className="size-3" />
                {lead.phone ?? "No contact"}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="size-3.5 text-muted-foreground" />
          <span>{lead.city ?? "Unknown"}</span>
        </div>
        <div className="text-xs text-muted-foreground ml-5">
          {lead.region ?? ""}
        </div>
      </TableCell>
      <TableCell>
        {lead.cuisine ? (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 font-normal"
          >
            {lead.cuisine}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs">
          {lead.reservationSystem ?? "None"}
        </span>
      </TableCell>
      <TableCell>
        {lead.botDeployed ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 text-[10px] py-0 px-1.5 font-normal gap-1">
            <Bot className="size-3" />
            Live
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground"
          >
            Not deployed
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Select defaultValue={lead.priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-7 w-[100px] text-xs border-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Badge
              variant="outline"
              className={priorityBadge.badge + " cursor-pointer"}
            >
              {priorityBadge.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {LEAD_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select defaultValue={lead.status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-7 w-[130px] text-xs border-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Badge
              variant="outline"
              className={statusBadge.badge + " cursor-pointer"}
            >
              {statusBadge.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {RESTAURANT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {RESTAURANT_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onMessage}
            title={lead.message ? "View message" : "Generate message"}
          >
            {lead.message ? (
              <>
                <MessageCircle className="size-3.5 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-600">Ready</span>
              </>
            ) : (
              <>
                <Wand2 className="size-3.5" />
                <span className="hidden sm:inline">DM</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Trash2 className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Confirm delete
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-700"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5 mr-2" /> Delete restaurant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({
  onSeed,
  onAdd,
}: {
  onSeed: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center mb-4">
        <UtensilsCrossed className="size-7 text-emerald-500" />
      </div>
      <h3 className="text-lg font-semibold">No restaurants yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Load a starter list of UK restaurant Instagram handles, or add your
        first lead manually. Filter by cuisine, region, and reservation system
        to plan outreach.
      </p>
      <div className="flex gap-2 mt-5">
        <Button onClick={onSeed}>
          <Sparkles className="size-4" />
          Load sample restaurants
        </Button>
        <Button variant="outline" onClick={onAdd}>
          <Plus className="size-4" />
          Add manually
        </Button>
      </div>
    </div>
  );
}

/* ---------- Add/Edit dialog ---------- */
function LeadDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RestaurantLead | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instagram: "",
    phone: "",
    city: "",
    region: "",
    cuisine: "",
    hasWebsite: false,
    reservationSystem: "None",
    priority: "medium",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          instagram: editing.instagram ?? "",
          phone: editing.phone ?? "",
          city: editing.city ?? "",
          region: editing.region ?? "",
          cuisine: editing.cuisine ?? "",
          hasWebsite: editing.hasWebsite,
          reservationSystem: editing.reservationSystem ?? "None",
          priority: editing.priority,
          notes: editing.notes ?? "",
        });
      } else {
        setForm({
          name: "",
          instagram: "",
          phone: "",
          city: "",
          region: "",
          cuisine: "",
          hasWebsite: false,
          reservationSystem: "None",
          priority: "medium",
          notes: "",
        });
      }
    }
  }, [open, editing]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Missing info",
        description: "Restaurant name is required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        instagram: form.instagram.trim() ? form.instagram.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        city: form.city.trim(),
        region: form.region,
        cuisine: form.cuisine,
        hasWebsite: form.hasWebsite,
        reservationSystem: form.reservationSystem,
        priority: form.priority,
        notes: form.notes.trim(),
      };
      if (editing) {
        const res = await fetch(`/api/restaurants/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast({ title: "Restaurant updated" });
      } else {
        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast({
          title: "Restaurant added",
          description: data.lead?.instagram
            ? `@${data.lead.instagram}`
            : data.lead?.name,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit restaurant" : "Add new restaurant"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this restaurant."
              : "Add a UK restaurant to your outreach pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="r-name">Restaurant name *</Label>
            <Input
              id="r-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. The Copper Pot"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="r-ig">Instagram handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="r-ig"
                  value={form.instagram}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      instagram: e.target.value.replace(/^@/, ""),
                    })
                  }
                  placeholder="thecopperpot"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="r-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="020 7946 0000"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="r-city">City</Label>
              <Input
                id="r-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="London"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-region">Region</Label>
              <Select
                value={form.region}
                onValueChange={(v) => setForm({ ...form, region: v })}
              >
                <SelectTrigger id="r-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="r-cuisine">Cuisine</Label>
              <Select
                value={form.cuisine}
                onValueChange={(v) => setForm({ ...form, cuisine: v })}
              >
                <SelectTrigger id="r-cuisine">
                  <SelectValue placeholder="Select cuisine" />
                </SelectTrigger>
                <SelectContent>
                  {CUISINES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-res">Reservation system</Label>
              <Select
                value={form.reservationSystem}
                onValueChange={(v) =>
                  setForm({ ...form, reservationSystem: v })
                }
              >
                <SelectTrigger id="r-res">
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_SYSTEMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="r-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger id="r-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-web">Website</Label>
              <label className="flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer select-none">
                <Checkbox
                  id="r-web"
                  checked={form.hasWebsite}
                  onCheckedChange={(v) =>
                    setForm({ ...form, hasWebsite: v === true })
                  }
                />
                <span className="text-xs inline-flex items-center gap-1">
                  <Globe className="size-3.5 text-muted-foreground" />
                  Has a website
                </span>
              </label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="r-notes">Notes</Label>
            <Textarea
              id="r-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Follower count, owner name, menu highlights, why they would benefit from an AI booking bot."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add restaurant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Message dialog (1-click DM workflow) ---------- */
function MessageDialog({
  open,
  onOpenChange,
  lead,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: RestaurantLead | null;
  onUpdated: (lead: RestaurantLead) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setMessage(lead.message || "");
      setDetail(lead.detail || "");
      setCopied(false);
    }
  }, [open, lead]);

  const generate = async (regenerate = false) => {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/restaurants/${lead.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail: detail || null, regenerate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      if (data.lead) onUpdated(data.lead);
      toast({
        title: "Message generated",
        description: "Review, edit, then copy and open Instagram.",
      });
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyAndOpen = async () => {
    if (!lead || !message) return;
    const doCopy = async () => {
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    };
    await doCopy();
    setCopied(true);
    if (lead.instagram) {
      window.open(`https://instagram.com/${lead.instagram}`, "_blank");
      toast({
        title: "Copied. Instagram opened.",
        description:
          "Click Message on their profile and paste (Ctrl+V or Cmd+V).",
      });
    } else {
      toast({
        title: "Copied to clipboard.",
        description: "No Instagram handle on file. Paste it where you need.",
      });
    }
    setTimeout(() => setCopied(false), 3000);
  };

  const saveEdit = async () => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/restaurants/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: lead.notes, detail, message }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.lead) onUpdated(data.lead);
      toast({ title: "Message saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (!lead) return null;
  const charCount = message.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="size-4 text-emerald-500" />
            DM for {lead.name}
          </DialogTitle>
          <DialogDescription>
            {lead.instagram ? (
              <a
                href={`https://instagram.com/${lead.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-600 inline-flex items-center gap-1"
              >
                @{lead.instagram}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {lead.phone ?? "No contact on file"}
              </span>
            )}
            {" · "}
            {lead.city ?? lead.region ?? "UK"}
            {" · "}
            {lead.cuisine ?? "Restaurant"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Detail input — for Line 1 personalization */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-500" />
              Specific detail for Line 1
            </Label>
            <Input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. the paella, their tasting menu, the brunch"
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Check their Instagram for 60-90 seconds. Find ONE specific thing. Leave blank to use category + city.
            </p>
          </div>

          {message ? (
            <>
              <div className="relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="resize-none pr-16 text-sm leading-relaxed"
                  placeholder="Your DM message."
                />
                <span
                  className={`absolute bottom-2 right-3 text-[10px] ${
                    charCount > 1000
                      ? "text-rose-500 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {charCount}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generate(true)}
                  disabled={generating}
                  className="text-xs"
                >
                  {generating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveEdit}
                  className="text-xs"
                >
                  <Pencil className="size-3.5" />
                  Save edits
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyAndOpen}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copied. {lead.instagram ? "Open IG." : "Ready."}
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      {lead.instagram
                        ? "Copy & Open Instagram"
                        : "Copy to clipboard"}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                {lead.instagram
                  ? "Message copied to clipboard. On their IG profile, click Message and paste."
                  : "Message copied to clipboard. No Instagram handle on file, paste it where you need."}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center">
                <MessageCircle className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">No message yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Generate a personalized cold DM using AI. It reads the
                  restaurant name, city, and cuisine to write a unique opening
                  line, no generic &ldquo;I came across your restaurant&rdquo;.
                </p>
              </div>
              <Button
                onClick={() => generate(false)}
                disabled={generating}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Writing your DM.
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    Generate personalized DM
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
