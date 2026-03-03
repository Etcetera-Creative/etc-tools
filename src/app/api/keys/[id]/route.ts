import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";

// DELETE /api/keys/[id] — revoke an API key
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (apiKey.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revoked: true },
  });

  return NextResponse.json({ ok: true });
}
