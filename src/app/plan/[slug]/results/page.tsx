"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CalendarGrid } from "@/components/calendar-grid";
import { ComparisonCalendar, getPersonColor } from "@/components/comparison-calendar";
import { TimeHeatmapBar } from "@/components/time-heatmap-bar";
import { format, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { Pencil } from "lucide-react";
import type { TimeWindow } from "@/components/time-window-editor";

interface ResponseData {
  id: string;
  guestName: string;
  selectedDates: string[];
  comment: string | null;
  selectedTimeWindows: Record<string, TimeWindow[]> | null;
}

interface PlanWithResponses {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  creatorId: string;
  mode: string;
  availableDates: string[];
  timeWindows: Record<string, TimeWindow[]> | null;
  desiredDuration: number | null;
  responses: ResponseData[];
}

export default function ResultsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [plan, setPlan] = useState<PlanWithResponses | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<ResponseData | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"heatmap" | "responses">("heatmap");
  const [isOwner, setIsOwner] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [closedHeatmapDays, setClosedHeatmapDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/plans/${slug}/results`);
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const planData = await res.json();
        setPlan(planData);
        setEditedDescription(planData.description || "");
        setIsOwner(true);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">You don&apos;t have access to this plan.</p>
        <Link href="/login">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Plan not found.</p>
      </div>
    );
  }

  const rangeStart = parseISO(plan.startDate);
  const rangeEnd = parseISO(plan.endDate);
  const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const heatmapData = allDays.map((day) => {
    const names: string[] = [];
    for (const r of plan.responses) {
      if (r.selectedDates.some((d) => isSameDay(parseISO(d), day))) {
        names.push(r.guestName);
      }
    }
    return { date: day, count: names.length, names };
  });

  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1);

  const personDates = selectedPerson
    ? selectedPerson.selectedDates.map((d) => parseISO(d))
    : [];

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/plan/${plan.slug}` : "";

  async function saveDescription() {
    if (!plan) return;
    setSavingDescription(true);
    const res = await fetch(`/api/plans/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editedDescription }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlan({ ...plan, description: updated.description });
      setIsEditingDescription(false);
    }
    setSavingDescription(false);
  }

  // Build guest entries for time heatmap on a specific day
  function getGuestEntriesForDay(day: Date) {
    const dateKey = day.toISOString().split("T")[0];
    const entries: { guestName: string; windows: TimeWindow[] }[] = [];
    for (const r of plan!.responses) {
      if (r.selectedTimeWindows && r.selectedTimeWindows[dateKey]) {
        entries.push({ guestName: r.guestName, windows: r.selectedTimeWindows[dateKey] });
      }
    }
    return entries;
  }

  function getDaysWithResponses(): Date[] {
    if (!plan || plan.mode !== "DATE_TIME_SELECTION") return [];
    const days: Date[] = [];
    for (const day of allDays) {
      const key = day.toISOString().split("T")[0];
      const hasResponse = plan.responses.some(
        (r) => r.selectedTimeWindows && r.selectedTimeWindows[key]
      );
      if (hasResponse && !closedHeatmapDays.has(key)) {
        days.push(day);
      }
    }
    return days;
  }

  function toggleHeatmapDay(day: Date) {
    const key = day.toISOString().split("T")[0];
    const next = new Set(closedHeatmapDays);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setClosedHeatmapDays(next);
  }

  function handleDayClick(day: Date) {
    if (plan?.mode === "DATE_TIME_SELECTION") {
      toggleHeatmapDay(day);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{plan.name}</h1>
            {isOwner && !isEditingDescription && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingDescription(true)}
                className="h-8 w-8"
                aria-label="Edit description"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={2}
                placeholder="Add a description..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDescription} disabled={savingDescription}>
                  {savingDescription ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setIsEditingDescription(false); setEditedDescription(plan.description || ""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground">
              {plan.description || (isOwner ? "No description" : "")}
            </p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href={`/plan/${plan.slug}`} className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Share Page</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "heatmap" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Heatmap
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "responses" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Responses
        </button>
      </div>

      {/* Heatmap Tab */}
      {activeTab === "heatmap" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Availability Heatmap</CardTitle>
              <CardDescription>
                {plan.responses.length} response{plan.responses.length !== 1 ? "s" : ""} ·
                Red = most available · Green = least available
                {plan.mode === "DATE_TIME_SELECTION" && " · Click a time block for details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarGrid
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                heatmapData={heatmapData}
                maxCount={maxCount}
                onDayClick={plan.mode === "DATE_TIME_SELECTION" ? handleDayClick : undefined}
              />
            </CardContent>
          </Card>

          {/* Time heatmap bars for all days with responses */}
          {plan.mode === "DATE_TIME_SELECTION" && plan.timeWindows && getDaysWithResponses().length > 0 && (
            <div className="space-y-3">
              {getDaysWithResponses().map((day) => (
                <TimeHeatmapBar
                  key={day.toISOString()}
                  date={day}
                  plannerWindows={plan.timeWindows![day.toISOString().split("T")[0]] || []}
                  guestEntries={getGuestEntriesForDay(day)}
                  onClose={() => toggleHeatmapDay(day)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Responses Tab */}
      {activeTab === "responses" && (
      <>
      {selectedPerson && !compareMode && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedPerson.guestName}&apos;s Availability</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPerson(null)}>✕ Close</Button>
            </div>
            <CardDescription>
              {selectedPerson.selectedDates.length} date{selectedPerson.selectedDates.length !== 1 ? "s" : ""} selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarGrid rangeStart={rangeStart} rangeEnd={rangeEnd} selectedDates={personDates} selectable={false} />
          </CardContent>
        </Card>
      )}

      {compareMode && selectedPeople.size >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Schedule Comparison</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setCompareMode(false); setSelectedPeople(new Set()); }}>✕ Close</Button>
            </div>
            <CardDescription>
              Comparing {selectedPeople.size} people · Each colored dot represents one person&apos;s availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComparisonCalendar
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              people={Array.from(selectedPeople).map((id) => {
                const response = plan.responses.find((r) => r.id === id)!;
                return {
                  id: response.id,
                  name: response.guestName,
                  dates: response.selectedDates.map((d) => parseISO(d)),
                  color: "",
                };
              })}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Responses</CardTitle>
            {plan.responses.length >= 2 && (
              <div className="flex gap-2">
                {compareMode && selectedPeople.size >= 2 && (
                  <Button size="sm" onClick={() => {}}>Compare ({selectedPeople.size})</Button>
                )}
                <Button
                  variant={compareMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => { setCompareMode(!compareMode); if (!compareMode) { setSelectedPeople(new Set()); setSelectedPerson(null); } }}
                >
                  {compareMode ? "Cancel" : "Compare"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plan.responses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-3">No responses yet. Share the link to get started!</p>
              <Link href={`/plan/${plan.slug}`}><Button variant="outline">Go to Share Page</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.responses.map((r) => {
                const isChecked = selectedPeople.has(r.id);
                return (
                  <div
                    key={r.id}
                    className={`w-full flex items-start gap-3 border rounded-lg p-4 transition-colors ${
                      compareMode
                        ? isChecked ? "border-primary bg-primary/5" : "hover:bg-accent"
                        : selectedPerson?.id === r.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                    }`}
                  >
                    {compareMode && (
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          const newSelected = new Set(selectedPeople);
                          if (e.currentTarget.checked) newSelected.add(r.id);
                          else newSelected.delete(r.id);
                          setSelectedPeople(newSelected);
                        }}
                        className="mt-1"
                      />
                    )}
                    <button
                      onClick={() => {
                        if (compareMode) {
                          const newSelected = new Set(selectedPeople);
                          if (isChecked) newSelected.delete(r.id);
                          else newSelected.add(r.id);
                          setSelectedPeople(newSelected);
                        } else {
                          setSelectedPerson(selectedPerson?.id === r.id ? null : r);
                        }
                      }}
                      className="flex-1 flex flex-col items-start text-left"
                    >
                      <div className="w-full flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{r.guestName}</p>
                          <p className="text-sm text-muted-foreground">
                            {r.selectedDates.map((d) => format(parseISO(d), "MMM d")).join(", ")}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {r.selectedDates.length} date{r.selectedDates.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-2 italic">&ldquo;{r.comment}&rdquo;</p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
