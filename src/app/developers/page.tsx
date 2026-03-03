"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Key, Plus, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre">
        {children.trim()}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs bg-background border hover:bg-accent"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ─── Endpoint Doc ────────────────────────────────────────────────────────────

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: string;
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    POST: "bg-green-500/10 text-green-700 dark:text-green-400",
    DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${methodColors[method] || ""}`}
        >
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      fetchKeys();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchKeys() {
    setLoading(true);
    const res = await fetch("/api/keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data);
    }
    setLoading(false);
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewRawKey(data.rawKey);
      setNewKeyName("");
      fetchKeys();
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchKeys();
    }
  }

  function copyKey() {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-12">
      {/* ─── API Keys Section ─────────────────────────────────────────── */}
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Developers</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys and learn how to use the Etc Tools API.
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-4">API Keys</h2>

        {/* New key reveal */}
        {newRawKey && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-600 dark:text-amber-400">
                ⚠️ Save your API key now
              </CardTitle>
              <CardDescription>
                This key will only be shown once. Copy it and store it securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                  {newRawKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-3 text-muted-foreground"
                onClick={() => setNewRawKey(null)}
              >
                I&apos;ve saved it — dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {showCreateForm ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Key name (e.g. CI bot)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createKey()}
                />
                <Button onClick={createKey} disabled={creating || !newKeyName.trim()}>
                  {creating ? "Creating..." : "Create"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button className="mb-6" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create New Key
          </Button>
        )}

        {/* Key list */}
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No API keys yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create one to start using the API.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <Card key={key.id} className={key.revoked ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        {key.revoked && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                            Revoked
                          </span>
                        )}
                      </div>
                      <code className="text-sm text-muted-foreground font-mono">
                        {key.prefix}...
                      </code>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Created {formatDate(key.createdAt)}</span>
                        <span>Last used {formatDate(key.lastUsedAt)}</span>
                        {key.expiresAt && <span>Expires {formatDate(key.expiresAt)}</span>}
                      </div>
                    </div>
                    {!key.revoked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => revokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ─── API Documentation ────────────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">API Documentation</h2>
          <p className="text-muted-foreground mt-1">
            The Etc Tools API lets you manage plans and short links programmatically.
            All endpoints require authentication via an API key.
          </p>
        </div>

        {/* Authentication */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Authentication</h3>
          <p className="text-sm text-muted-foreground">
            Pass your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code> header
            as a Bearer token. All keys are prefixed with <code className="bg-muted px-1.5 py-0.5 rounded text-xs">etc_</code>.
          </p>
          <CodeBlock>{`curl -H "Authorization: Bearer etc_your_api_key" \\
  https://etcetera.cr/api/v1/plans`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            Invalid or revoked keys will return a <code className="bg-muted px-1.5 py-0.5 rounded text-xs">401 Unauthorized</code> response.
          </p>
        </div>

        {/* Response format */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Response Format</h3>
          <p className="text-sm text-muted-foreground">
            All successful responses wrap the payload in a <code className="bg-muted px-1.5 py-0.5 rounded text-xs">data</code> object.
            Errors return an <code className="bg-muted px-1.5 py-0.5 rounded text-xs">error</code> string with an appropriate HTTP status code.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Success</p>
              <CodeBlock>{`{
  "data": { ... }
}`}</CodeBlock>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Error</p>
              <CodeBlock>{`{
  "error": "Description of what went wrong"
}`}</CodeBlock>
            </div>
          </div>
        </div>

        {/* ── Plans API ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plans</h3>

          <Endpoint
            method="GET"
            path="/api/v1/plans"
            description="List all plans you've created. Supports pagination."
          >
            <div>
              <p className="text-xs font-medium mb-1">Query parameters</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">limit</code> — Max results (default 50, max 100)</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">offset</code> — Skip N results (default 0)</p>
              </div>
            </div>
            <CodeBlock>{`curl -H "Authorization: Bearer etc_your_key" \\
  "https://etcetera.cr/api/v1/plans?limit=10"`}</CodeBlock>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Example response</summary>
              <CodeBlock>{`{
  "data": {
    "items": [
      {
        "id": "abc123",
        "slug": "xK9mB2pQ1r",
        "name": "Team Offsite",
        "description": "Planning the Q2 offsite",
        "mode": "DATE_RANGE",
        "startDate": "2026-04-01T00:00:00.000Z",
        "endDate": "2026-04-15T00:00:00.000Z",
        "responseCount": 5,
        "shareUrl": "https://etcetera.cr/plan/xK9mB2pQ1r",
        "createdAt": "2026-03-01T12:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}`}</CodeBlock>
            </details>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/plans"
            description="Create a new plan."
          >
            <div>
              <p className="text-xs font-medium mb-1">Body (JSON)</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">name</code> <span className="text-red-500">*</span> — Plan name</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">startDate</code> <span className="text-red-500">*</span> — ISO 8601 date string</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">endDate</code> <span className="text-red-500">*</span> — ISO 8601 date string</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">description</code> — Optional description</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">mode</code> — <code className="text-xs">DATE_RANGE</code> (default), <code className="text-xs">DATE_SELECTION</code>, or <code className="text-xs">DATE_TIME_SELECTION</code></p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">availableDates</code> — Array of ISO date strings (for DATE_SELECTION mode)</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">timeWindows</code> — Time window config (for DATE_TIME_SELECTION mode)</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">desiredDuration</code> — Desired duration in minutes</p>
              </div>
            </div>
            <CodeBlock>{`curl -X POST -H "Authorization: Bearer etc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Team Offsite",
    "startDate": "2026-04-01",
    "endDate": "2026-04-15",
    "description": "Finding the best dates for Q2"
  }' \\
  https://etcetera.cr/api/v1/plans`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/plans/:slug"
            description="Get details for a specific plan including configuration and response count."
          >
            <CodeBlock>{`curl -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/plans/xK9mB2pQ1r`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/plans/:slug/results"
            description="Get full results for a plan including all individual responses."
          >
            <CodeBlock>{`curl -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/plans/xK9mB2pQ1r/results`}</CodeBlock>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Example response</summary>
              <CodeBlock>{`{
  "data": {
    "id": "abc123",
    "slug": "xK9mB2pQ1r",
    "name": "Team Offsite",
    "responseCount": 2,
    "responses": [
      {
        "id": "resp1",
        "guestName": "Alex",
        "selectedDates": ["2026-04-05", "2026-04-06"],
        "selectedTimeWindows": null,
        "comment": "Either day works!",
        "createdAt": "2026-03-02T15:30:00.000Z"
      }
    ],
    ...
  }
}`}</CodeBlock>
            </details>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/plans/:slug/share"
            description="Generate a share-ready payload with formatted dates and a share URL. Useful for building share messages in bots or automations."
          >
            <CodeBlock>{`curl -X POST -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/plans/xK9mB2pQ1r/share`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/plans/:slug"
            description="Permanently delete a plan and all its responses."
          >
            <CodeBlock>{`curl -X DELETE -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/plans/xK9mB2pQ1r`}</CodeBlock>
          </Endpoint>
        </div>

        {/* ── URL Shortener API ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">URL Shortener</h3>

          <Endpoint
            method="GET"
            path="/api/v1/shortener"
            description="List all your short links. Supports pagination."
          >
            <div>
              <p className="text-xs font-medium mb-1">Query parameters</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">limit</code> — Max results (default 50, max 100)</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">offset</code> — Skip N results (default 0)</p>
              </div>
            </div>
            <CodeBlock>{`curl -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/shortener`}</CodeBlock>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Example response</summary>
              <CodeBlock>{`{
  "data": {
    "items": [
      {
        "id": "link1",
        "slug": "abc123",
        "url": "https://example.com/very-long-url",
        "shortUrl": "https://etcetera.cr/s/abc123",
        "clickCount": 42,
        "expiresAt": "2026-04-03T00:00:00.000Z",
        "createdAt": "2026-03-03T12:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}`}</CodeBlock>
            </details>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/shortener"
            description="Create a new short link."
          >
            <div>
              <p className="text-xs font-medium mb-1">Body (JSON)</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">url</code> <span className="text-red-500">*</span> — Destination URL</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">slug</code> — Custom slug (3-50 chars, alphanumeric + hyphens). Auto-generated if omitted.</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">expiresIn</code> — Expiration: <code className="text-xs">1d</code>, <code className="text-xs">7d</code>, <code className="text-xs">30d</code> (default), <code className="text-xs">90d</code>, <code className="text-xs">1y</code>, or <code className="text-xs">never</code></p>
              </div>
            </div>
            <CodeBlock>{`curl -X POST -H "Authorization: Bearer etc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/my-long-url",
    "slug": "my-link",
    "expiresIn": "90d"
  }' \\
  https://etcetera.cr/api/v1/shortener`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/shortener/:slug"
            description="Get details for a specific short link including click count."
          >
            <CodeBlock>{`curl -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/shortener/my-link`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/shortener/:slug"
            description="Permanently delete a short link."
          >
            <CodeBlock>{`curl -X DELETE -H "Authorization: Bearer etc_your_key" \\
  https://etcetera.cr/api/v1/shortener/my-link`}</CodeBlock>
          </Endpoint>
        </div>

        {/* Rate limits / notes */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Notes</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>All dates are returned in ISO 8601 format (UTC).</li>
            <li>You can only access plans and short links that you created.</li>
            <li>Revoked API keys will immediately stop working.</li>
            <li>Paginated endpoints default to 50 results per page (max 100).</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
