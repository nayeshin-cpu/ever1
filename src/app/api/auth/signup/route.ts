import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json(
      { error: "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }

  // users 테이블에 행 추가
  const { error: insertError } = await supabase.from("users").insert({
    id: data.user.id,
    email: data.user.email,
    tos_version: "TOS-2026-01",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // subscriptions 테이블에 Free 플랜 추가
  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: data.user.id,
      plan_type: "free",
      status: "active",
      monthly_generation_limit: 1,
      monthly_generation_used: 0,
      current_period_start: today.toISOString().split("T")[0],
      current_period_end: monthEnd.toISOString().split("T")[0],
    });

  if (subscriptionError) {
    console.warn("Free subscription 생성 실패:", subscriptionError);
    // 이것은 fatal하지 않으므로 계속 진행
  }

  return NextResponse.json({ success: true, userId: data.user.id });
}
