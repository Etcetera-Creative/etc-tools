"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format, isPast, parseISO, startOfDay, eachDayOfInterval, subDays } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";

interface ShortLink {
  slug: string;
  destinationUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
}

interface LinkClick {
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
}

export default function ShortLinkAnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [link, setLink] = useState<ShortLink | null>(null);
  const [clicks, setClicks] = useState<LinkClick[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`/api/shortener/${slug}`);
      if (!res.ok) {
        window.location.href = "/shortener/dashboard";
        return;
      }

      const data = await res.json();
      setLink(data.link);
      setClicks(data.clicks);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading || !link) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isExpired = link.expiresAt && isPast(new Date(link.expiresAt));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  const shortUrl = `${baseUrl}/s/${link.slug}`;

  // Click timeline (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 29);
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
  
  const clicksByDay = new Map<string, number>();
  clicks.forEach((click) => {
    const day = format(startOfDay(parseISO(click.clickedAt)), "yyyy-MM-dd");
    clicksByDay.set(day, (clicksByDay.get(day) || 0) + 1);
  });

  const maxClicks = Math.max(...days.map((day) => clicksByDay.get(format(day, "yyyy-MM-dd")) || 0), 1);

  // Top referrers
  const referrerCounts = new Map<string, number>();
  clicks.forEach((click) => {
    const ref = click.referrer || "Direct";
    referrerCounts.set(ref, (referrerCounts.get(ref) || 0) + 1);
  });
  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Recent clicks
  const recentClicks = [...clicks]
    .sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime())
    .slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="mb-6">
        <Link href="/shortener/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <code className="text-primary">/s/{link.slug}</code>
              {isExpired && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                  Expired
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-2 break-all">
              {link.destinationUrl}
            </p>
          </div>
          <a
            href={link.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Clicks</CardDescription>
            <CardTitle className="text-3xl">{link.clickCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Created</CardDescription>
            <CardTitle className="text-xl">
              {format(new Date(link.createdAt), "MMM d, yyyy")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expires</CardDescription>
            <CardTitle className="text-xl">
              {link.expiresAt
                ? format(new Date(link.expiresAt), "MMM d, yyyy")
                : "Never"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Short URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={shortUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
            />
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(shortUrl)}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Click Timeline (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const count = clicksByDay.get(dayStr) || 0;
              const height = maxClicks > 0 ? (count / maxClicks) * 100 : 0;

              return (
                <div
                  key={dayStr}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
                    {format(day, "MMM d")}: {count} click{count !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{format(thirtyDaysAgo, "MMM d")}</span>
            <span>{format(today, "MMM d")}</span>
          </div>
        </CardContent>
      </Card>

      {topReferrers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReferrers.map(([referrer, count]) => (
                <div key={referrer} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1 mr-4">
                    {referrer === "Direct" ? (
                      <span className="text-muted-foreground">Direct / No Referrer</span>
                    ) : (
                      referrer
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    {count} click{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentClicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentClicks.map((click, idx) => (
                <div key={idx} className="text-sm border-b pb-3 last:border-0">
                  <div className="flex justify-between items-start gap-4 mb-1">
                    <span className="text-muted-foreground">
                      {format(parseISO(click.clickedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {click.referrer && (
                    <div className="text-xs text-muted-foreground truncate">
                      From: {click.referrer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
