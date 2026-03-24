import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

interface TossWebhookPayload {
  eventType: string;
  data: {
    orderId: string;
    customerKey: string;
    status: string;
    failureCode?: string;
    failureMessage?: string;
  };
}

/**
 * TossPayments 웹훅 인증
 * 실제 구현에서는 TossPayments의 서명 검증을 수행해야 함
 */
function verifyTossSignature(payload: string, signature: string): boolean {
  // TODO: 실제 TossPayments 서명 검증 로직
  // 현재는 간단한 구현
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 웹훅 payload 받기
    const payload = (await request.json()) as TossWebhookPayload;
    const signature = request.headers.get("toss-signature") || "";

    // 서명 검증
    if (!verifyTossSignature(JSON.stringify(payload), signature)) {
      return NextResponse.json(
        { error: "서명 검증 실패" },
        { status: 401 }
      );
    }

    const { eventType, data } = payload;
    const { customerKey } = data;

    console.log(`Toss webhook received: ${eventType} for ${customerKey}`);

    // 이벤트 타입별 처리
    if (eventType === "payment.approved") {
      // 결제 성공
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          toss_order_id: data.orderId,
        })
        .eq("user_id", customerKey);

      if (error) {
        console.error("구독 업데이트 실패:", error);
      }
    } else if (eventType === "payment.failed") {
      // 결제 실패
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "paused",
        })
        .eq("user_id", customerKey);

      if (error) {
        console.error("구독 상태 업데이트 실패:", error);
      }

      // TODO: 결제 실패 알림 이메일 발송
    } else if (eventType === "subscription.cancelled") {
      // 구독 취소
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: now,
        })
        .eq("user_id", customerKey);

      if (error) {
        console.error("구독 취소 업데이트 실패:", error);
      }

      // TODO: 구독 취소 확인 이메일 발송
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toss webhook error:", error);
    return NextResponse.json(
      { error: "웹훅 처리 실패" },
      { status: 500 }
    );
  }
}
