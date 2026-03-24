import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`
    );
  }

  // 첫 로그인인 경우 users 테이블에 행 추가
  if (data.user) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        display_name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          null,
        tos_version: "TOS-2026-01",
      });
    }
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
}
