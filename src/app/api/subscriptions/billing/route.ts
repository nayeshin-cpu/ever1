import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface BillingRequest {
  authKey: string;
  planType: "basic" | "premium";
}

interface BillingKeyResponse {
  billingKey: string;
}

interface PaymentResponse {
  orderId: string;
}

const PLAN_CONFIG: Record<string, { limit: number; pricePerMonth: number }> = {
  basic: { limit: 4, pricePerMonth: 9900 },
  premium: { limit: 9999, pricePerMonth: 19900 },
};

export async function POST(request: NextRequest) {
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

    const { authKey, planType } = (await request.json()) as BillingRequest;

    if (!authKey || !planType) {
      return NextResponse.json(
        { error: "authKey와 planType이 필요합니다" },
        { status: 400 }
      );
    }

    if (!PLAN_CONFIG[planType]) {
      return NextResponse.json(
        { error: "유효하지 않은 플랜입니다" },
        { status: 400 }
      );
    }

    // TossPayments API로 빌링키 발급
    const billingKeyResponse = await fetch(
      "https://api.tosspayments.com/v1/billing/auth/issue",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.TOSS_CLIENT_KEY}:`
          ).toString("base64")}`,
        },
        body: JSON.stringify({
          authKey,
          customerKey: user.id,
        }),
      }
    );

    if (!billingKeyResponse.ok) {
      const errorData = await billingKeyResponse.json();
      return NextResponse.json(
        { error: `빌링키 발급 실패: ${errorData.message}` },
        { status: 400 }
      );
    }

    const { billingKey } = (await billingKeyResponse.json()) as BillingKeyResponse;

    // 첫 결제 처리
    const orderId = `order_${Date.now()}_${user.id.substring(0, 8)}`;
    const planConfig = PLAN_CONFIG[planType];

    const paymentResponse = await fetch(
      "https://api.tosspayments.com/v1/billing/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.TOSS_CLIENT_KEY}:`
          ).toString("base64")}`,
        },
        body: JSON.stringify({
          billingKey,
          customerKey: user.id,
          amount: planConfig.pricePerMonth,
          orderId,
          orderName: `EverPet ${planType} 플랜`,
        }),
      }
    );

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      return NextResponse.json(
        { error: `결제 실패: ${errorData.message}` },
        { status: 400 }
      );
    }

    // 기간 계산
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 구독 정보 업데이트
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        plan_type: planType,
        status: "active",
        monthly_generation_limit: planConfig.limit,
        monthly_generation_used: 0,
        toss_billing_key: billingKey,
        toss_order_id: orderId,
        current_period_start: monthStart.toISOString().split("T")[0],
        current_period_end: monthEnd.toISOString().split("T")[0],
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "구독 정보 업데이트 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      planType,
      nextBillingDate: monthEnd.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Billing API error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}
