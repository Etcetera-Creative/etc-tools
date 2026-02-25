import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | null;
  const defaultNext = type === "recovery" ? `${origin}/reset-password` : `${origin}/dashboard`;
  const next = searchParams.get("next") ?? defaultNext;

  if (token_hash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      return NextResponse.redirect(next);
    }
  }

  // Verification failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
