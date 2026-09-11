"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Target,
  Users,
  MessageSquare,
  Trophy,
  TrendingUp,
  Filter,
  X,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MessageCircle,
  Copy,
  Check,
  Wand2,
  UtensilsCrossed,
  Mail,
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
  LEAD_STATUSES,
  REGIONS,
  COUNTRIES,
  DISCIPLINES,
  LEAD_PRIORITIES,
  STATUS_META,
  PRIORITY_META,
  type LeadStatus,
  type LeadPriority,
} from "@/lib/constants";
import type { GymLead, LeadStats } from "@/lib/types";
import RestaurantWorkspace from "@/components/restaurant-workspace";

export default function Home() {
  const { toast } = useToast();

  // workspace switcher
  const [workspace, setWorkspace] = useState<"gym" | "restaurant">("gym");
  const [restaurantBulkGen, setRestaurantBulkGen] = useState(false);
  const [emailBulkGen, setEmailBulkGen] = useState(false);

  const [leads, setLeads] = useState<GymLead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // add/edit dialog
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GymLead | null>(null);

  // message dialog
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageLead, setMessageLead] = useState<GymLead | null>(null);

  // email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<GymLead | null>(null);

  // bulk generation
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // verified-only filter (medium/high priority = verified, low = needs verification)
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (regionFilter !== "all") params.set("region", regionFilter);
      if (countryFilter !== "all") params.set("country", countryFilter);
      if (disciplineFilter !== "all") params.set("discipline", disciplineFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch {
      toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, regionFilter, countryFilter, disciplineFilter, priorityFilter, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, leads.length]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/leads/seed", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Seed complete",
        description: `Inserted ${data.inserted} • Skipped ${data.skipped} (already existed) • Total ${data.total}`,
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
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Status updated", description: `Marked as ${STATUS_META[status as LeadStatus]?.label}` });
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
      const res = await fetch(`/api/leads/${id}`, {
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
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Lead deleted", description: name });
      fetchStats();
    } catch {
      fetchLeads();
    }
  };

  // Bulk-generate emails for leads that don't have one yet
  const bulkGenerateEmails = async () => {
    setEmailBulkGen(true);
    try {
      const res = await fetch("/api/leads/generate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Emails generated",
        description: `${data.generated} created. Refreshing…`,
      });
      fetchLeads();
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEmailBulkGen(false);
    }
  };

  // Bulk-generate messages for leads that don't have one yet
  const bulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      const res = await fetch("/api/leads/generate-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Messages generated",
        description: `${data.generated} created • ${data.failed} failed. Refreshing…`,
      });
      fetchLeads();
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBulkGenerating(false);
    }
  };

  // Restaurant bulk generate
  const restaurantBulkGenerate = async () => {
    setRestaurantBulkGen(true);
    try {
      const res = await fetch("/api/restaurants/generate-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({
        title: "Restaurant messages generated",
        description: `${data.generated} created. Refreshing…`,
      });
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRestaurantBulkGen(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "instagram",
      "city",
      "region",
      "disciplines",
      "status",
      "priority",
      "notes",
      "contactedAt",
      "followUpAt",
    ];
    const rows = leads.map((l) =>
      [
        l.name,
        "@" + l.instagram,
        l.city ?? "",
        l.region ?? "",
        l.disciplines,
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
    a.download = `uk-gym-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${leads.length} leads to CSV` });
  };

  const clearFilters = () => {
    setQ("");
    setStatusFilter("all");
    setRegionFilter("all");
    setCountryFilter("all");
    setDisciplineFilter("all");
    setPriorityFilter("all");
    setVerifiedOnly(false);
    setPage(1);
  };

  const hasFilters =
    q || statusFilter !== "all" || regionFilter !== "all" || countryFilter !== "all" || disciplineFilter !== "all" || priorityFilter !== "all" || verifiedOnly;

  // apply verified-only filter client-side (medium/high priority = verified)
  const displayLeads = useMemo(() => {
    if (!verifiedOnly) return leads;
    return leads.filter((l) => l.priority === "medium" || l.priority === "high");
  }, [leads, verifiedOnly]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(displayLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLeads = displayLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [q, statusFilter, regionFilter, countryFilter, disciplineFilter, priorityFilter, verifiedOnly]);

  // response rate
  const responseRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    const contacted = stats.byStatus.contacted + stats.byStatus.replied + stats.byStatus.interested + stats.byStatus.won + stats.byStatus.lost;
    const responded = stats.byStatus.replied + stats.byStatus.interested + stats.byStatus.won;
    if (contacted === 0) return 0;
    return Math.round((responded / contacted) * 100);
  }, [stats]);

  const winRate = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.byStatus.won / stats.total) * 100);
  }, [stats]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl bg-gradient-to-br ${workspace === "gym" ? "from-rose-500 to-orange-500 shadow-rose-500/20" : "from-emerald-500 to-teal-500 shadow-emerald-500/20"} flex items-center justify-center shadow-lg`}>
              {workspace === "gym" ? <Target className="size-5 text-white" /> : <UtensilsCrossed className="size-5 text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {workspace === "gym" ? "GymReach" : "DineReach"} CRM
              </h1>
              <p className="text-xs text-muted-foreground">
                {workspace === "gym"
                  ? "Cold outreach for MMA, Muay Thai & Boxing gyms"
                  : "Reservation bot outreach for UK restaurants"}
              </p>
            </div>
          </div>

          {/* Workspace switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-slate-50 dark:bg-slate-900 p-0.5">
              <button
                onClick={() => setWorkspace("gym")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  workspace === "gym"
                    ? "bg-white dark:bg-slate-800 text-rose-600 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target className="size-3.5" />
                Gyms
              </button>
              <button
                onClick={() => setWorkspace("restaurant")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  workspace === "restaurant"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UtensilsCrossed className="size-3.5" />
                Restaurants
              </button>
            </div>
          </div>

          {workspace === "gym" && (
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
              Load starter leads
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkGenerate}
              disabled={bulkGenerating}
              title="Generate personalized DMs for leads missing one"
            >
              {bulkGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              <span className="hidden sm:inline">Generate DMs</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkGenerateEmails}
              disabled={emailBulkGen}
              title="Generate personalized emails for leads missing one"
            >
              {emailBulkGen ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              <span className="hidden sm:inline">Generate Emails</span>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }}>
              <Plus className="size-4" />
              Add lead
            </Button>
          </div>
          )}
        </div>
      </header>

      {workspace === "restaurant" ? (
        <RestaurantWorkspace
          bulkGenerating={restaurantBulkGen}
          onBulkGenerate={restaurantBulkGenerate}
        />
      ) : (
      <>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon={<Users className="size-4" />}
            label="Total leads"
            value={stats?.total ?? 0}
            sub={`${(stats?.byPriority.medium ?? 0) + (stats?.byPriority.high ?? 0)} verified`}
            accent="from-slate-500 to-slate-700"
          />
          <StatCard
            icon={<BadgeCheck className="size-4" />}
            label="Verified"
            value={(stats?.byPriority.medium ?? 0) + (stats?.byPriority.high ?? 0)}
            sub="from web search"
            accent="from-emerald-500 to-green-600"
          />
          <StatCard
            icon={<AlertCircle className="size-4" />}
            label="To verify"
            value={stats?.byPriority.low ?? 0}
            sub="LLM-suggested"
            accent="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={<MessageSquare className="size-4" />}
            label="Contacted"
            value={stats?.byStatus.contacted ?? 0}
            sub={`${responseRate}% response rate`}
            accent="from-sky-500 to-cyan-600"
          />
          <StatCard
            icon={<Trophy className="size-4" />}
            label="Won"
            value={stats?.byStatus.won ?? 0}
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
                  placeholder="Search gym name, @handle or city…"
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
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
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
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All disciplines</SelectItem>
                    {DISCIPLINES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
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
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="size-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <span className="hidden sm:inline">No filters applied — showing all leads</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={leads.length === 0}>
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
            <EmptyState onSeed={handleSeed} onAdd={() => { setEditing(null); setAddOpen(true); }} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                      <TableHead className="min-w-[220px]">Gym</TableHead>
                      <TableHead className="min-w-[140px]">Location</TableHead>
                      <TableHead className="min-w-[180px]">Disciplines</TableHead>
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
                        onEdit={() => { setEditing(lead); setAddOpen(true); }}
                        onDelete={() => deleteLead(lead.id, lead.name)}
                        onMessage={() => { setMessageLead(lead); setMessageOpen(true); }}
                        onEmail={() => { setEmailLead(lead); setEmailOpen(true); }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                  {"–"}
                  <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, displayLeads.length)}</span>
                  {" of "}
                  <span className="font-medium text-foreground">{displayLeads.length}</span>
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
            GymReach CRM · {stats?.total ?? 0} leads tracked · {(stats?.byPriority.medium ?? 0) + (stats?.byPriority.high ?? 0)} verified · {stats?.byPriority.low ?? 0} to verify
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
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }}
      />

      {/* Email dialog */}
      <EmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        lead={emailLead}
        onUpdated={(updated) => {
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }}
      />
      </>
      )}
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
      <div className={`absolute -right-4 -top-4 size-16 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className={`size-7 rounded-lg bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
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
  onEmail,
}: {
  lead: GymLead;
  onStatusChange: (s: string) => void;
  onPriorityChange: (p: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  onEmail: () => void;
}) {
  const disciplines = lead.disciplines.split(",").map((d) => d.trim()).filter(Boolean);
  const statusBadge = STATUS_META[lead.status as LeadStatus] ?? STATUS_META.new;
  const priorityBadge = PRIORITY_META[lead.priority as LeadPriority] ?? PRIORITY_META.medium;

  return (
    <TableRow className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-gradient-to-br from-rose-500/15 to-orange-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Instagram className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate flex items-center gap-1.5">
              {lead.name}
              {(lead.priority === "medium" || lead.priority === "high") && (
                <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <a
              href={`https://instagram.com/${lead.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1"
            >
              @{lead.instagram}
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="size-3.5 text-muted-foreground" />
          <span>{lead.city ?? "—"}</span>
        </div>
        <div className="text-xs text-muted-foreground ml-5">{lead.region ?? ""}{lead.country ? ` · ${lead.country}` : ""}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {disciplines.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            disciplines.map((d) => (
              <Badge key={d} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                {d}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <Select defaultValue={lead.priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-7 w-[100px] text-xs border-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Badge variant="outline" className={priorityBadge.badge + " cursor-pointer"}>
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
            <Badge variant="outline" className={statusBadge.badge + " cursor-pointer"}>
              {statusBadge.label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
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
            title={lead.message ? "View DM" : "Generate DM"}
          >
            {lead.message ? (
              <>
                <MessageCircle className="size-3.5 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-600">DM</span>
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
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onEmail}
            title={lead.emailMessage ? "View email" : "Generate email"}
          >
            {lead.emailMessage ? (
              <>
                <Mail className="size-3.5 text-sky-500" />
                <span className="hidden sm:inline text-sky-600">Email</span>
              </>
            ) : (
              <>
                <Mail className="size-3.5" />
                <span className="hidden sm:inline">Email</span>
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit} title="Edit">
            <Pencil className="size-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Trash2 className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Confirm delete</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={onDelete}>
                <Trash2 className="size-3.5 mr-2" /> Delete lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ onSeed, onAdd }: { onSeed: () => void; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="size-14 rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-500/15 flex items-center justify-center mb-4">
        <Target className="size-7 text-rose-500" />
      </div>
      <h3 className="text-lg font-semibold">No leads yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Load the verified starter list of ~38 UK MMA, Muay Thai &amp; Boxing gym Instagram handles, or add your first lead manually.
      </p>
      <div className="flex gap-2 mt-5">
        <Button onClick={onSeed}>
          <Sparkles className="size-4" />
          Load starter leads
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
  editing: GymLead | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instagram: "",
    city: "",
    region: "",
    disciplines: [] as string[],
    priority: "medium",
    notes: "",
    status: "new",
    followUpAt: "",
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          instagram: editing.instagram,
          city: editing.city ?? "",
          region: editing.region ?? "",
          disciplines: editing.disciplines.split(",").map((d) => d.trim()).filter(Boolean),
          priority: editing.priority,
          notes: editing.notes ?? "",
          status: editing.status,
          followUpAt: editing.followUpAt ? editing.followUpAt.slice(0, 10) : "",
        });
      } else {
        setForm({
          name: "",
          instagram: "",
          city: "",
          region: "",
          disciplines: [],
          priority: "medium",
          notes: "",
          status: "new",
          followUpAt: "",
        });
      }
    }
  }, [open, editing]);

  const toggleDiscipline = (d: string) => {
    setForm((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d)
        ? f.disciplines.filter((x) => x !== d)
        : [...f.disciplines, d],
    }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.instagram.trim()) {
      toast({ title: "Missing info", description: "Gym name and Instagram handle are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        instagram: form.instagram.trim(),
        city: form.city.trim(),
        region: form.region,
        disciplines: form.disciplines.join(","),
        priority: form.priority,
        notes: form.notes.trim(),
      };
      if (editing) {
        const res = await fetch(`/api/leads/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, followUpAt: form.followUpAt || null }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast({ title: "Lead updated" });
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast({ title: "Lead added", description: `@${data.lead.instagram}` });
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
          <DialogTitle>{editing ? "Edit lead" : "Add new lead"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the details for this gym." : "Add a UK gym to your outreach pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Gym name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Stonebridge Boxing Club"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ig">Instagram handle *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                id="ig"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value.replace(/^@/, "") })}
                placeholder="stonebridgeboxingclub"
                className="pl-8"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="London"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Disciplines</Label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => {
                const active = form.disciplines.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDiscipline(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      active
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-background border-input hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="grid gap-2">
                <Label htmlFor="followUp">Follow-up date</Label>
                <Input
                  id="followUp"
                  type="date"
                  value={form.followUpAt}
                  onChange={(e) => setForm({ ...form, followUpAt: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Follower count, coach name, what they offer, why they're a good fit…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Message dialog (1-click DM workflow with detail) ---------- */
function MessageDialog({
  open,
  onOpenChange,
  lead,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: GymLead | null;
  onUpdated: (lead: GymLead) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setMessage(lead.message || "");
      setDetail(lead.detail || "");
      setCopied(false);
      setSkipped(lead.message === "SKIP — needs manual detail");
    }
  }, [open, lead]);

  const generate = async (regenerate = false) => {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail: detail || null, regenerate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      setSkipped(data.skipped === true);
      if (data.lead) onUpdated(data.lead);
      if (data.skipped) {
        toast({
          title: "Needs manual detail",
          description: "Add a specific detail (dish, class, coach name) to generate Line 1.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Message generated", description: "Review, edit, then copy & open Instagram." });
      }
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
    if (!lead || !message || skipped) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.open(`https://instagram.com/${lead.instagram}`, "_blank");
      toast({
        title: "Copied! Instagram opened",
        description: "Click Message on their profile and paste (Ctrl+V / Cmd+V).",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      window.open(`https://instagram.com/${lead.instagram}`, "_blank");
      setCopied(true);
      toast({ title: "Copied! Instagram opened", description: "Paste the message in their DM." });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!lead) return null;
  const charCount = message.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="size-4 text-rose-500" />
            DM — {lead.name}
          </DialogTitle>
          <DialogDescription>
            <a
              href={`https://instagram.com/${lead.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-rose-600 inline-flex items-center gap-1"
            >
              @{lead.instagram}
              <ExternalLink className="size-3" />
            </a>
            {" · "}
            {lead.city ?? lead.region ?? "UK"}
            {" · "}
            {lead.disciplines || "MMA"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Detail input — for Line 1 personalization */}
          <div className="grid gap-1.5">
            <Label htmlFor="detail" className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-500" />
              Specific detail for Line 1
            </Label>
            <Input
              id="detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. their kids BJJ program, coach Brad, the paella, 2 boxing rings"
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Check their Instagram for 60-90 seconds. Find ONE specific thing. If left blank and nothing is in notes, the message will be skipped.
            </p>
          </div>

          {skipped ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-center">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">SKIP — needs manual detail</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No specific detail was found in the notes. Add one above (check their Instagram for 60-90 seconds), then click Generate.
              </p>
            </div>
          ) : message ? (
            <>
              <div className="relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="resize-none pr-16 text-sm leading-relaxed"
                  placeholder="Your DM message…"
                />
                <span
                  className={`absolute bottom-2 right-3 text-[10px] ${
                    charCount > 1000 ? "text-rose-500 font-medium" : "text-muted-foreground"
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
                  onClick={async () => {
                    if (!lead) return;
                    try {
                      const res = await fetch(`/api/leads/${lead.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ detail, message }),
                      });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      if (data.lead) onUpdated(data.lead);
                      toast({ title: "Saved" });
                    } catch (e) {
                      toast({ title: "Save failed", description: e instanceof Error ? e.message : "error", variant: "destructive" });
                    }
                  }}
                  className="text-xs"
                >
                  <Pencil className="size-3.5" />
                  Save
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyAndOpen}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copied! Open IG →
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy &amp; Open Instagram
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Message copied to clipboard. On their IG profile, click &ldquo;Message&rdquo; and paste.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
              <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500/15 to-orange-500/15 flex items-center justify-center">
                <MessageCircle className="size-6 text-rose-500" />
              </div>
              <div>
                <p className="font-medium text-sm">No message yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Add a specific detail above (or leave blank to auto-extract from notes), then generate.
                </p>
              </div>
              <Button onClick={() => generate(false)} disabled={generating} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    Generate DM
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

/* ---------- Email dialog ---------- */
function EmailDialog({
  open,
  onOpenChange,
  lead,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: GymLead | null;
  onUpdated: (lead: GymLead) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [detail, setDetail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setEmail(lead.emailMessage || "");
      setDetail(lead.detail || "");
      setCopied(false);
    }
  }, [open, lead]);

  const generate = async (regenerate = false) => {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail: detail || null, regenerate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data.email);
      if (data.lead) onUpdated(data.lead);
      toast({ title: "Email generated" });
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

  const copyEmail = async () => {
    if (!lead || !email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast({ title: "Email copied to clipboard" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast({ title: "Email copied" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-sky-500" />
            Email — {lead.name}
          </DialogTitle>
          <DialogDescription>
            <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 inline-flex items-center gap-1">
              @{lead.instagram}
              <ExternalLink className="size-3" />
            </a>
            {" · "}
            {lead.city ?? lead.region ?? "UK"}
            {lead.country ? ` · ${lead.country}` : ""}
            {" · "}
            {lead.disciplines || "MMA"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-500" />
              Specific detail for the email
            </Label>
            <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. their kids BJJ program, coach Brad, 2 boxing rings" className="text-sm" />
          </div>

          {email ? (
            <>
              <Textarea value={email} onChange={(e) => setEmail(e.target.value)} rows={12} className="resize-none text-sm leading-relaxed font-mono" />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => generate(true)} disabled={generating} className="text-xs">
                  {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm" onClick={copyEmail} className="text-xs">
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied!" : "Copy Email"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
              <div className="size-12 rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/15 flex items-center justify-center">
                <Mail className="size-6 text-sky-500" />
              </div>
              <div>
                <p className="font-medium text-sm">No email generated yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Generates a personalized cold email with subject line, hook, pain, offer, and close.</p>
              </div>
              <Button onClick={() => generate(false)} disabled={generating} className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white">
                {generating ? (<><Loader2 className="size-4 animate-spin" />Generating...</>) : (<><Mail className="size-4" />Generate Email</>)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
