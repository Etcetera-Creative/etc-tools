"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { ExternalLink, Trash2, BarChart3 } from "lucide-react";

interface ShortLink {
  id: string;
  slug: string;
  destinationUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
}

export default function ShortenerDashboardPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/shortener");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this short link? This cannot be undone.")) return;

    const res = await fetch(`/api/shortener/${slug}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev.filter((link) => link.slug !== slug));
    }
  }

  function handleCopy(slug: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/s/${slug}`);
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Your Short Links</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your shortened URLs
          </p>
        </div>
        <Link href="/shortener">
          <Button>Create New Link</Button>
        </Link>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created any short links yet.
            </p>
            <Link href="/shortener">
              <Button>Create Your First Link</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => {
            const isExpired = link.expiresAt && isPast(new Date(link.expiresAt));
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
            const shortUrl = `${baseUrl}/s/${link.slug}`;

            return (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <code className="text-primary">/s/{link.slug}</code>
                        {isExpired && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                            Expired
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2 break-all">
                        {link.destinationUrl}
                      </CardDescription>
                    </div>
                    <a
                      href={link.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {link.clickCount} click{link.clickCount !== 1 ? "s" : ""} ·{" "}
                      Created {format(new Date(link.createdAt), "MMM d, yyyy")} ·{" "}
                      {link.expiresAt
                        ? `Expires ${format(new Date(link.expiresAt), "MMM d, yyyy")}`
                        : "Never expires"}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleCopy(link.slug)}
                      >
                        Copy Link
                      </Button>
                      <Link href={`/shortener/dashboard/${link.slug}`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="w-full">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(link.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
