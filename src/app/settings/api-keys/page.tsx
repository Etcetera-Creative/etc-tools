"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Key, Plus, Trash2 } from "lucide-react";

interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

export default function ApiKeysPage() {
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

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys for programmatic access to Etc Tools.
        </p>
      </div>

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
                placeholder="Key name (e.g. Tank bot key)"
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
              Create one to start using the programmatic API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card
              key={key.id}
              className={key.revoked ? "opacity-60" : ""}
            >
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
                      <span>
                        Last used {formatDate(key.lastUsedAt)}
                      </span>
                      {key.expiresAt && (
                        <span>Expires {formatDate(key.expiresAt)}</span>
                      )}
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
    </div>
  );
}
