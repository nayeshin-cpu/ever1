import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // x-internal-secret 인증
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json(
        { error: "인증 실패" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      requestId,
      status,
      progress,
      outputMediaId,
      errorMessage,
    } = body;

    console.log(
      `Generation done: id=${requestId}, status=${status}, progress=${progress}`
    );

    const supabase = createServerSupabaseClient();

    const updateData: Record<string, unknown> = {
      progress: progress ?? 50,
    };

    // 상태에 따라 업데이트
    if (status === "generating") {
      updateData.status = "generating";
    } else if (status === "encoding") {
      updateData.status = "encoding";
    } else if (status === "done") {
      updateData.status = "done";
      updateData.progress = 100;
      updateData.completed_at = new Date().toISOString();
      if (outputMediaId) {
        updateData.output_media_id = outputMediaId;
      }
    } else if (status === "failed") {
      // ref: TRD v2.1 §7.2 (AI 생성 실패 2회 — 크레딧 반환)
      // ref: PRD v2.1 §10 (제약 — 생성 실패 시 크레딧 복구)
      updateData.status = "failed";
      updateData.progress = 0;
      updateData.error_message = errorMessage ?? "AI 영상 생성에 실패했습니다";

      // generation_requests에서 user_id 조회
      const { data: genRequest, error: fetchError } = await supabase
        .from("generation_requests")
        .select("user_id")
        .eq("id", requestId)
        .single();

      if (fetchError || !genRequest) {
        console.error("generation_requests 조회 실패:", fetchError);
      } else {
        // 크레딧(monthly_generation_used) 자동 반환
        // 0 미만으로 내리지 않도록 현재 값을 먼저 조회 후 처리
        const { data: subscription, error: subFetchError } = await supabase
          .from("subscriptions")
          .select("monthly_generation_used")
          .eq("user_id", genRequest.user_id)
          .single();

        if (subFetchError || !subscription) {
          console.error("subscriptions 조회 실패:", subFetchError);
        } else {
          const currentUsed = subscription.monthly_generation_used ?? 0;
          const newUsed = Math.max(0, currentUsed - 1);

          const { error: refundError } = await supabase
            .from("subscriptions")
            .update({ monthly_generation_used: newUsed })
            .eq("user_id", genRequest.user_id);

          if (refundError) {
            console.error("크레딧 반환 실패:", refundError);
          } else {
            console.log(
              `크레딧 반환 완료: user_id=${genRequest.user_id}, ${currentUsed} → ${newUsed}`
            );
          }
        }
      }
    }

    const { error } = await supabase
      .from("generation_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      throw error;
    }

    console.log(`Generation request ${requestId} updated to ${updateData.status}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Generation done callback error:", error);
    return NextResponse.json(
      { error: "콜백 처리 실패" },
      { status: 500 }
    );
  }
}
