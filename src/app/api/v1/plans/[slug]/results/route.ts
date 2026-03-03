import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";

function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// GET /api/v1/plans/[slug]/results — get full results with responses
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { slug } = await params;

  const plan = await prisma.plan.findUnique({
    where: { slug },
    include: {
      responses: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          guestName: true,
          selectedDates: true,
          selectedTimeWindows: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  if (!plan || plan.creatorId !== auth.creatorId) {
    return apiError("Plan not found", 404);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  return apiResponse({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    mode: plan.mode,
    startDate: plan.startDate,
    endDate: plan.endDate,
    availableDates: plan.availableDates,
    timeWindows: plan.timeWindows,
    desiredDuration: plan.desiredDuration,
    shareUrl: `${baseUrl}/plan/${plan.slug}`,
    responseCount: plan.responses.length,
    responses: plan.responses,
    createdAt: plan.createdAt,
  });
}
