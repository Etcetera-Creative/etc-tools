import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";

function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// GET /api/v1/shortener/[slug] — get link details + click count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { slug } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      destinationUrl: true,
      createdAt: true,
      expiresAt: true,
      clickCount: true,
      creatorId: true,
    },
  });

  if (!link || link.creatorId !== auth.creatorId) {
    return apiError("Short link not found", 404);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  return apiResponse({
    id: link.id,
    slug: link.slug,
    url: link.destinationUrl,
    shortUrl: `${baseUrl}/s/${link.slug}`,
    clickCount: link.clickCount,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
  });
}

// DELETE /api/v1/shortener/[slug] — delete a short link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { slug } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { slug },
  });

  if (!link || link.creatorId !== auth.creatorId) {
    return apiError("Short link not found", 404);
  }

  await prisma.shortLink.delete({ where: { id: link.id } });

  return apiResponse({ ok: true });
}
