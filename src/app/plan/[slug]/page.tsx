"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateSelector } from "@/components/date-selector";
import { TimeWindowSelector } from "@/components/time-window-selector";
import { MarkdownDescription } from "@/components/markdown-description";
import { parseISO, isSameDay } from "date-fns";
import type { TimeWindow } from "@/components/time-window-editor";

interface PlanData {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  creatorName: string | null;
  mode: string;
  availableDates: string[];
  timeWindows: Record<string, TimeWindow[]> | null;
  desiredDuration: number | null;
}

export default function PlanGuestPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [guestName, setGuestName] = useState("");
  const [comment, setComment] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [guestTimeWindows, setGuestTimeWindows] = useState<Record<string, TimeWindow[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/plans/${slug}`);
      if (res.ok) {
        setPlan(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const enabledDates = plan && (plan.mode === "DATE_SELECTION" || plan.mode === "DATE_TIME_SELECTION")
    ? plan.availableDates.map((d) => parseISO(d))
    : undefined;

  function toggleDate(date: Date) {
    setSelectedDates((prev) => {
      const exists = prev.find((d) => isSameDay(d, date));
      if (exists) {
        const next = prev.filter((d) => !isSameDay(d, date));
        // Remove time windows for deselected date
        const key = date.toISOString().split("T")[0];
        setGuestTimeWindows((tw) => {
          const newTW = { ...tw };
          delete newTW[key];
          return newTW;
        });
        return next;
      }
      const next = [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      // Add default time window for DATE_TIME_SELECTION
      if (plan?.mode === "DATE_TIME_SELECTION" && plan.timeWindows) {
        const key = date.toISOString().split("T")[0];
        const plannerWindows = plan.timeWindows[key] || [];
        const defaultWindow = plannerWindows[0] || { start: "09:00", end: "17:00" };
        setGuestTimeWindows((tw) => ({
          ...tw,
          [key]: [{ start: defaultWindow.start, end: defaultWindow.end }],
        }));
      }
      return next;
    });
  }

  function selectAllDates(dates: Date[]) {
    const next = [...dates].sort((a, b) => a.getTime() - b.getTime());
    setSelectedDates(next);

    if (plan?.mode === "DATE_TIME_SELECTION" && plan.timeWindows) {
      setGuestTimeWindows((prev) => {
        const updated: Record<string, TimeWindow[]> = {};

        for (const date of next) {
          const key = date.toISOString().split("T")[0];
          if (prev[key]?.length) {
            updated[key] = prev[key];
            continue;
          }
          const plannerWindows = plan.timeWindows?.[key] || [];
          const defaultWindow = plannerWindows[0] || { start: "09:00", end: "17:00" };
          updated[key] = [{ start: defaultWindow.start, end: defaultWindow.end }];
        }

        return updated;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDates.length === 0) {
      setError("Please select at least one date");
      return;
    }
    if (plan?.mode === "DATE_TIME_SELECTION") {
      const missing = selectedDates.some((d) => {
        const key = d.toISOString().split("T")[0];
        return !guestTimeWindows[key] || guestTimeWindows[key].length === 0;
      });
      if (missing) {
        setError("Please add time windows for all selected dates");
        return;
      }
      const hasInvalid = Object.values(guestTimeWindows).some((windows) =>
        windows.some((w) => w.start && w.end && w.start >= w.end)
      );
      if (hasInvalid) {
        setError("All start times must be before their end times");
        return;
      }
    }
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      guestName,
      selectedDates: selectedDates.map((d) => d.toISOString()),
      comment: comment.trim() || null,
    };
    if (plan?.mode === "DATE_TIME_SELECTION") {
      body.selectedTimeWindows = guestTimeWindows;
    }

    const res = await fetch(`/api/plans/${slug}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
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

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center space-y-2">
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-semibold">You&apos;re in!</p>
            <p className="text-muted-foreground">
              Your availability for <strong>{plan.name}</strong> has been submitted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <Card>
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          {plan.creatorName && (
            <CardDescription className="text-sm">
              Invited by: {plan.creatorName}
            </CardDescription>
          )}
          <CardDescription>
            {plan.mode === "DATE_TIME_SELECTION"
              ? "Select the dates and times you're available"
              : "Select the dates you're available"}
          </CardDescription>
        </CardHeader>
        {plan.description && (
          <div className="px-6 pb-4">
            <MarkdownDescription content={plan.description} />
          </div>
        )}
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="guestName">Your Name</Label>
              <Input
                id="guestName"
                placeholder="John Doe"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Any notes or preferences..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Your Available Dates</Label>
              <DateSelector
                rangeStart={parseISO(plan.startDate)}
                rangeEnd={parseISO(plan.endDate)}
                selectedDates={selectedDates}
                onToggle={toggleDate}
                enabledDates={enabledDates}
                onSelectAll={selectAllDates}
              />
            </div>

            {/* Time window selection for DATE_TIME_SELECTION */}
            {plan.mode === "DATE_TIME_SELECTION" && selectedDates.length > 0 && plan.timeWindows && (
              <div className="space-y-4">
                <Label>Select Your Available Times</Label>
                {selectedDates.map((date) => {
                  const key = date.toISOString().split("T")[0];
                  const plannerWindows = plan.timeWindows![key] || [];
                  return (
                    <TimeWindowSelector
                      key={key}
                      date={date}
                      plannerWindows={plannerWindows}
                      desiredDuration={plan.desiredDuration}
                      guestWindows={guestTimeWindows[key] || []}
                      onChange={(w) => setGuestTimeWindows({ ...guestTimeWindows, [key]: w })}
                    />
                  );
                })}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Availability"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
