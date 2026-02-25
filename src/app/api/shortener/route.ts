import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { addDays, subDays, isPast } from "date-fns";

// GET /api/shortener — list short links for the authenticated user
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.shortLink.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      destinationUrl: true,
      createdAt: true,
      expiresAt: true,
      clickCount: true,
    },
  });

  return NextResponse.json(links);
}

// POST /api/shortener — create a new short link
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { destinationUrl, customSlug, expirationDays } = body;

  if (!destinationUrl) {
    return NextResponse.json({ error: "Destination URL is required" }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(destinationUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let slug = customSlug;

  // If custom slug provided, validate it
  if (customSlug) {
    if (!/^[a-zA-Z0-9-]{3,50}$/.test(customSlug)) {
      return NextResponse.json(
        { error: "Custom slug must be 3-50 characters (alphanumeric and hyphens only)" },
        { status: 400 }
      );
    }

    // Check if slug exists
    const existing = await prisma.shortLink.findUnique({
      where: { slug: customSlug },
    });

    // If exists and not expired, error
    if (existing && (!existing.expiresAt || !isPast(new Date(existing.expiresAt)))) {
      return NextResponse.json(
        { error: "This slug is already taken" },
        { status: 409 }
      );
    }

    // If exists but expired, delete it (allow overwrite)
    if (existing && existing.expiresAt && isPast(new Date(existing.expiresAt))) {
      await prisma.shortLink.delete({ where: { id: existing.id } });
    }
  } else {
    // Generate random slug
    slug = nanoid(6);

    // Ensure uniqueness (very unlikely to collide, but check anyway)
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.shortLink.findUnique({
        where: { slug },
      });
      if (!existing) break;
      slug = nanoid(6);
      attempts++;
    }
  }

  // Calculate expiration
  let expiresAt: Date | null = null;
  if (expirationDays && expirationDays > 0) {
    expiresAt = addDays(new Date(), expirationDays);
  }

  // Lazy expiration pruning: delete up to 100 links expired more than 7 days ago
  const sevenDaysAgo = subDays(new Date(), 7);
  const expiredLinks = await prisma.shortLink.findMany({
    where: {
      expiresAt: {
        lt: sevenDaysAgo,
      },
    },
    take: 100,
    select: { id: true },
  });

  if (expiredLinks.length > 0) {
    await prisma.shortLink.deleteMany({
      where: {
        id: {
          in: expiredLinks.map((link) => link.id),
        },
      },
    });
  }

  // Create the link
  const link = await prisma.shortLink.create({
    data: {
      slug,
      destinationUrl,
      creatorId: user.id,
      expiresAt,
    },
  });

  return NextResponse.json(link, { status: 201 });
}
