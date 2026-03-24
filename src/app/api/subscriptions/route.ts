import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface SubscriptionData {
  id: string;
  user_id: string;
  plan_type: "free" | "basic" | "premium";
  status: "active" | "paused" | "cancelled" | "expired";
  monthly_generation_limit: number;
  monthly_generation_used: number;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 구독 정보 조회
    const { data: subscription, error: queryError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (queryError) {
      return NextResponse.json(
        { error: "구독 정보 조회 실패" },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "구독 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription as SubscriptionData);
  } catch (error) {
    console.error("Subscriptions GET error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 구독 해지 처리
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: now,
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "구독 해지 처리 실패" },
        { status: 500 }
      );
    }

    // TODO: 이메일 확인 발송

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscriptions DELETE error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}
