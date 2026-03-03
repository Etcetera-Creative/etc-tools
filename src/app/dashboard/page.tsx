"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  _count: { responses: number };
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(slug: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also delete all responses.`)) return;

    const res = await fetch(`/api/plans/${slug}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.slug !== slug));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Your Plans</h1>
        <Link href="/dashboard/new">
          <Button>New Plan</Button>
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created any plans yet.
            </p>
            <Link href="/dashboard/new">
              <Button>Create Your First Plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.description && (
                  <CardDescription className="line-clamp-2 break-words overflow-hidden">{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(plan.startDate), "MMM d")} –{" "}
                    {format(new Date(plan.endDate), "MMM d, yyyy")} ·{" "}
                    {plan._count.responses} response{plan._count.responses !== 1 ? "s" : ""}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/plan/${plan.slug}`
                        );
                      }}
                    >
                      Copy Link
                    </Button>
                    <Link href={`/plan/${plan.slug}/results`} className="flex-1 sm:flex-none">
                      <Button size="sm" className="w-full">View Results</Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleDelete(plan.slug, plan.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
