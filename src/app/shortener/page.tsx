"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowRight, Link as LinkIcon } from "lucide-react";

export default function ShortenerPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [expiration, setExpiration] = useState("30");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ slug: string; shortUrl: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setLoggedIn(true);
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function handleCreate() {
    setError("");
    setResult(null);

    if (!destinationUrl) {
      setError("Destination URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(destinationUrl);
    } catch {
      setError("Please enter a valid URL (including http:// or https://)");
      return;
    }

    // Validate custom slug if provided
    if (customSlug && !/^[a-zA-Z0-9-]{3,50}$/.test(customSlug)) {
      setError("Custom slug must be 3-50 characters (alphanumeric and hyphens only)");
      return;
    }

    setCreating(true);

    const res = await fetch("/api/shortener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationUrl,
        customSlug: customSlug || undefined,
        expirationDays: parseInt(expiration),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create short link");
      setCreating(false);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    setResult({
      slug: data.slug,
      shortUrl: `${baseUrl}/s/${data.slug}`,
    });
    setDestinationUrl("");
    setCustomSlug("");
    setExpiration("30");
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">URL Shortener</h1>
          <p className="text-muted-foreground mt-1">
            Create short, shareable links
          </p>
        </div>
        <Link href="/shortener/dashboard">
          <Button variant="outline">View Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Short Link</CardTitle>
          <CardDescription>
            Enter a URL to shorten. Optionally customize the slug and set an expiration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Destination URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/very/long/url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Custom Slug (optional)</Label>
            <Input
              id="slug"
              placeholder="my-custom-slug"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for a random 6-character slug
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration">Expiration</Label>
            <select
              id="expiration"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="0">Never</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-primary/10 p-4 rounded-md space-y-3">
              <p className="text-sm font-medium">Short link created!</p>
              <div className="flex items-center gap-2">
                <Input
                  value={result.shortUrl}
                  readOnly
                  className="bg-background"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(result.shortUrl);
                  }}
                >
                  Copy
                </Button>
              </div>
              <Link href={`/shortener/dashboard/${result.slug}`}>
                <Button variant="link" className="p-0 h-auto">
                  View analytics <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full"
          >
            {creating ? "Creating..." : "Create Short Link"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
