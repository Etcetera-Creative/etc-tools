"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface UserInfo {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignIn: string | null;
  emailConfirmed: boolean;
  planCount: number;
  linkCount: number;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setError("Access denied. Admin only.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Failed to load users.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUsers(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const totalPlans = users.reduce((sum, u) => sum + u.planCount, 0);
  const totalLinks = users.reduce((sum, u) => sum + u.linkCount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{users.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{totalPlans}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{totalLinks}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Short Links</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Signed Up</th>
                  <th className="pb-3 pr-4 font-medium">Last Sign In</th>
                  <th className="pb-3 pr-4 font-medium text-center">Verified</th>
                  <th className="pb-3 pr-4 font-medium text-right">Plans</th>
                  <th className="pb-3 font-medium text-right">Links</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{u.displayName || "—"}</div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {u.lastSignIn
                        ? format(new Date(u.lastSignIn), "MMM d, yyyy h:mm a")
                        : "Never"}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {u.emailConfirmed ? "✓" : "✗"}
                    </td>
                    <td className="py-3 pr-4 text-right">{u.planCount}</td>
                    <td className="py-3 text-right">{u.linkCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
