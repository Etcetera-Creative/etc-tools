import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/api-auth";

// GET /api/keys — list user's API keys
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prefix: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revoked: true,
    },
  });

  return NextResponse.json(keys);
}

// POST /api/keys — create a new API key
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, expiresAt } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  // Generate raw key: etc_ + 40 hex chars
  const rawKey = "etc_" + randomBytes(20).toString("hex");
  const hash = hashApiKey(rawKey);
  const prefix = rawKey.slice(0, 8);

  const apiKey = await prisma.apiKey.create({
    data: {
      key: hash,
      prefix,
      name: name.trim(),
      creatorId: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      prefix: true,
      name: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Return the raw key ONCE
  return NextResponse.json({ ...apiKey, rawKey }, { status: 201 });
}
