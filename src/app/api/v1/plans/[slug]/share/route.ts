import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { format } from "date-fns";

function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// POST /api/v1/plans/[slug]/share — generate a share-ready payload
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { slug } = await params;

  const plan = await prisma.plan.findUnique({
    where: { slug },
    include: { _count: { select: { responses: true } } },
  });

  if (!plan || plan.creatorId !== auth.creatorId) {
    return apiError("Plan not found", 404);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";
  const shareUrl = `${baseUrl}/plan/${plan.slug}`;

  const startStr = format(plan.startDate, "MMM d, yyyy");
  const endStr = format(plan.endDate, "MMM d, yyyy");

  const dates =
    plan.availableDates.length > 0
      ? plan.availableDates.map((d) => format(d, "MMM d, yyyy"))
      : null;

  return apiResponse({
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    mode: plan.mode,
    url: shareUrl,
    dateRange: `${startStr} – ${endStr}`,
    specificDates: dates,
    responseCount: plan._count.responses,
  });
}
