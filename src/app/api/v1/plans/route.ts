import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { nanoid } from "nanoid";

function apiResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// POST /api/v1/plans — create a plan
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const {
    name,
    description,
    mode,
    startDate,
    endDate,
    availableDates,
    timeWindows,
    desiredDuration,
  } = body;

  if (!name || !startDate || !endDate) {
    return apiError("name, startDate, and endDate are required", 400);
  }

  const validModes = ["DATE_RANGE", "DATE_SELECTION", "DATE_TIME_SELECTION"];
  const planMode = validModes.includes(mode) ? mode : "DATE_RANGE";

  const slug = nanoid(10);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  const plan = await prisma.plan.create({
    data: {
      slug,
      name,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      mode: planMode,
      availableDates: Array.isArray(availableDates)
        ? availableDates.map((d: string) => new Date(d))
        : [],
      timeWindows: timeWindows || null,
      desiredDuration: desiredDuration ? parseInt(desiredDuration) : null,
      creatorId: auth.creatorId,
      creatorName: null,
    },
  });

  return apiResponse(
    {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      mode: plan.mode,
      startDate: plan.startDate,
      endDate: plan.endDate,
      shareUrl: `${baseUrl}/plan/${plan.slug}`,
      createdAt: plan.createdAt,
    },
    201
  );
}

// GET /api/v1/plans — list user's plans
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [plans, total] = await Promise.all([
    prisma.plan.findMany({
      where: { creatorId: auth.creatorId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { _count: { select: { responses: true } } },
    }),
    prisma.plan.count({ where: { creatorId: auth.creatorId } }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://etcetera.cr";

  return apiResponse({
    items: plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      mode: p.mode,
      startDate: p.startDate,
      endDate: p.endDate,
      responseCount: p._count.responses,
      shareUrl: `${baseUrl}/plan/${p.slug}`,
      createdAt: p.createdAt,
    })),
    total,
    limit,
    offset,
  });
}
