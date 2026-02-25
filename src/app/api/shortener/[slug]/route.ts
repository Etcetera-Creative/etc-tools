import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/shortener/[slug] — get link details and analytics
export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      destinationUrl: true,
      creatorId: true,
      createdAt: true,
      expiresAt: true,
      clickCount: true,
    },
  });

  if (!link || link.creatorId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get clicks
  const clicks = await prisma.linkClick.findMany({
    where: { shortLinkId: link.id },
    orderBy: { clickedAt: "desc" },
    select: {
      clickedAt: true,
      referrer: true,
      userAgent: true,
    },
  });

  return NextResponse.json({ link, clicks });
}

// DELETE /api/shortener/[slug] — delete a link
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { slug },
    select: { id: true, creatorId: true },
  });

  if (!link || link.creatorId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.shortLink.delete({
    where: { id: link.id },
  });

  return NextResponse.json({ success: true });
}
