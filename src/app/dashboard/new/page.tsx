"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeSelector, type PlanMode } from "@/components/mode-selector";
import { DateSelector } from "@/components/date-selector";
import { TimeWindowEditor, type TimeWindow } from "@/components/time-window-editor";
import { parseISO, isSameDay } from "date-fns";

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<PlanMode>("DATE_RANGE");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [desiredDuration, setDesiredDuration] = useState({ hours: 1, minutes: 0 });
  const [timeWindows, setTimeWindows] = useState<Record<string, TimeWindow[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDateSelection = mode === "DATE_SELECTION" || mode === "DATE_TIME_SELECTION";
  const needsTimeWindows = mode === "DATE_TIME_SELECTION";
  const totalSteps = needsTimeWindows ? 3 : 2;

  function syncTimeWindowsForDates(dates: Date[]) {
    const dateKeys = new Set(dates.map((d) => d.toISOString().split("T")[0]));

    setTimeWindows((prev) => {
      const newTW = { ...prev };

      for (const key of Object.keys(newTW)) {
        if (!dateKeys.has(key)) delete newTW[key];
      }

      for (const d of dates) {
        const key = d.toISOString().split("T")[0];
        if (!newTW[key]) newTW[key] = [{ start: "09:00", end: "17:00" }];
      }

      return newTW;
    });
  }

  function toggleDate(date: Date) {
    setSelectedDates((prev) => {
      const exists = prev.find((d) => isSameDay(d, date));
      const next = exists
        ? prev.filter((d) => !isSameDay(d, date))
        : [...prev, date].sort((a, b) => a.getTime() - b.getTime());

      syncTimeWindowsForDates(next);
      return next;
    });
  }

  function selectAllDates(dates: Date[]) {
    const next = [...dates].sort((a, b) => a.getTime() - b.getTime());
    setSelectedDates(next);
    syncTimeWindowsForDates(next);
  }

  function canProceed(): boolean {
    if (step === 1) return true;
    if (step === 2) {
      if (!name || !startDate || !endDate) return false;
      if (needsDateSelection && selectedDates.length === 0) return false;
      return true;
    }
    if (step === 3) {
      // Every selected date must have at least one window
      return selectedDates.every((d) => {
        const key = d.toISOString().split("T")[0];
        return timeWindows[key] && timeWindows[key].length > 0;
      });
    }
    return true;
  }

  function hasInvalidTimeWindows(tw: Record<string, TimeWindow[]>): boolean {
    return Object.values(tw).some((windows) =>
      windows.some((w) => w.start && w.end && w.start >= w.end)
    );
  }

  async function handleSubmit() {
    if (needsTimeWindows && hasInvalidTimeWindows(timeWindows)) {
      setError("All start times must be before their end times");
      return;
    }
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      name,
      description,
      startDate,
      endDate,
      mode,
    };

    if (needsDateSelection) {
      body.availableDates = selectedDates.map((d) => d.toISOString());
    }
    if (needsTimeWindows) {
      body.timeWindows = timeWindows;
      body.desiredDuration = desiredDuration.hours * 60 + desiredDuration.minutes;
    }

    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    const plan = await res.json();
    router.push(`/plan/${plan.slug}/results`);
  }

  function handleNext() {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            Create a New Plan
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Step {step} of {totalSteps}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Mode Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Choose a scheduling mode</Label>
              <ModeSelector value={mode} onChange={(m) => { setMode(m); setSelectedDates([]); setTimeWindows({}); }} />
            </div>
          )}

          {/* Step 2: Plan Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Boyz March Ski Trip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <p className="text-xs text-muted-foreground">This accepts markdown formatting</p>
                <Textarea
                  id="description"
                  placeholder="What's the plan about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Earliest Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Latest Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {needsDateSelection && startDate && endDate && (
                <div className="space-y-2">
                  <Label>Select Specific Dates</Label>
                  <DateSelector
                    rangeStart={parseISO(startDate)}
                    rangeEnd={parseISO(endDate)}
                    selectedDates={selectedDates}
                    onToggle={toggleDate}
                    onSelectAll={selectAllDates}
                  />
                </div>
              )}

              {needsTimeWindows && (
                <div className="space-y-2">
                  <Label>Desired Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={desiredDuration.hours}
                      onChange={(e) => setDesiredDuration({ ...desiredDuration, hours: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">hrs</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      step={15}
                      value={desiredDuration.minutes}
                      onChange={(e) => setDesiredDuration({ ...desiredDuration, minutes: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Time Windows (DATE_TIME_SELECTION only) */}
          {step === 3 && needsTimeWindows && (
            <div className="space-y-4">
              <Label>Set Time Windows for Each Date</Label>
              {selectedDates.map((date) => {
                const key = date.toISOString().split("T")[0];
                return (
                  <TimeWindowEditor
                    key={key}
                    date={date}
                    windows={timeWindows[key] || [{ start: "09:00", end: "17:00" }]}
                    onChange={(w) => setTimeWindows({ ...timeWindows, [key]: w })}
                  />
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              {step === totalSteps
                ? loading
                  ? "Creating..."
                  : "Create Plan"
                : "Next"}
            </Button>
            {step === 1 && (
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
