import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { nanoid } from "nanoid";
import { addDays, addYears, isPast } from "date-fns";

function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parseExpiresIn(expiresIn: string): Date | null {
  const map: Record<string, () => Date | null> = {
    "1d": () => addDays(new Date(), 1),
    "7d": () => addDays(new Date(), 7),
    "30d": () => addDays(new Date(), 30),
    "90d": () => addDays(new Date(), 90),
    "1y": () => addYears(new Date(), 1),
    never: () => null,
  };
  const fn = map[expiresIn];
  return fn ? fn() : addDays(new Date(), 30); // default 30d
}

// POST /api/v1/shortener — create short link
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { url, slug: customSlug, expiresIn } = body;

  if (!url || typeof url !== "string") {
    return apiError("url is required", 400);
  }

  try {
    new URL(url);
  } catch {
    return apiError("Invalid URL", 400);
  }

  let slug = customSlug;

  if (customSlug) {
    if (!/^[a-zA-Z0-9-]{3,50}$/.test(customSlug)) {
      return apiError(
        "Custom slug must be 3-50 characters (alphanumeric and hyphens only)",
        400
      );
    }

    const existing = await prisma.shortLink.findUnique({
      where: { slug: customSlug },
    });

    if (existing && (!existing.expiresAt || !isPast(new Date(existing.expiresAt)))) {
      return apiError("This slug is already taken", 409);
    }

    if (existing && existing.expiresAt && isPast(new Date(existing.expiresAt))) {
      await prisma.shortLink.delete({ where: { id: existing.id } });
    }
  } else {
    slug = nanoid(6);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.shortLink.findUnique({ where: { slug } });
      if (!existing) break;
      slug = nanoid(6);
      attempts++;
    }
  }

  const expiresAt = parseExpiresIn(expiresIn || "30d");

  const link = await prisma.shortLink.create({
    data: {
      slug,
      destinationUrl: url,
      creatorId: auth.creatorId,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  return apiResponse(
    {
      id: link.id,
      slug: link.slug,
      url: link.destinationUrl,
      shortUrl: `${baseUrl}/s/${link.slug}`,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    },
    201
  );
}

// GET /api/v1/shortener — list user's short links
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [links, total] = await Promise.all([
    prisma.shortLink.findMany({
      where: { creatorId: auth.creatorId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        slug: true,
        destinationUrl: true,
        createdAt: true,
        expiresAt: true,
        clickCount: true,
      },
    }),
    prisma.shortLink.count({ where: { creatorId: auth.creatorId } }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  return apiResponse({
    items: links.map((l) => ({
      id: l.id,
      slug: l.slug,
      url: l.destinationUrl,
      shortUrl: `${baseUrl}/s/${l.slug}`,
      clickCount: l.clickCount,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
    })),
    total,
    limit,
    offset,
  });
}
