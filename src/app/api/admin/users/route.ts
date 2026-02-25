import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/admin";

export async function GET() {
  // Verify the caller is admin
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all Supabase auth users
  const admin = createAdminSupabase();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get plan and shortlink counts per creator
  const planCounts = await prisma.plan.groupBy({
    by: ["creatorId"],
    _count: { id: true },
  });

  const linkCounts = await prisma.shortLink.groupBy({
    by: ["creatorId"],
    _count: { id: true },
  });

  const planMap = Object.fromEntries(planCounts.map((p) => [p.creatorId, p._count.id]));
  const linkMap = Object.fromEntries(linkCounts.map((l) => [l.creatorId, l._count.id]));

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.user_metadata?.display_name || null,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    emailConfirmed: !!u.email_confirmed_at,
    planCount: planMap[u.id] || 0,
    linkCount: linkMap[u.id] || 0,
  }));

  // Sort by most recent signup first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(result);
}
