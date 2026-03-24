import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const MONTHLY_QUOTA = 10; // 한 달에 최대 10번 생성

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // 임시: 비회원 UI 확인용
      return NextResponse.json({
        requestId: "mock-request-1",
        estimatedSeconds: 10, // 짧게 시뮬레이션
        status: "pending",
      });
    }

    const { petId, mediaId, mood } = await request.json();

    if (!petId || !mediaId || !mood) {
      return NextResponse.json(
        { error: "petId, mediaId, mood이 필요합니다" },
        { status: 400 }
      );
    }

    // 이번 달 생성 횟수 확인
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: monthlyRequests, error: queryError } = await supabase
      .from("generation_requests")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString());

    if (queryError) {
      return NextResponse.json(
        { error: "쿼리 실패" },
        { status: 500 }
      );
    }

    if ((monthlyRequests?.length ?? 0) >= MONTHLY_QUOTA) {
      return NextResponse.json(
        { error: "이번 달 생성 횟수를 모두 사용했어요" },
        { status: 429 }
      );
    }

    // generation_requests 테이블에 새 행 추가
    const requestId = uuidv4();
    const { error: insertError } = await supabase
      .from("generation_requests")
      .insert({
        id: requestId,
        user_id: user.id,
        pet_id: petId,
        input_media_id: mediaId,
        mood_preset: mood,
        status: "pending",
        progress: 0,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "생성 요청 저장 실패" },
        { status: 500 }
      );
    }

    // Railway 파이프라인 시작 (비동기)
    // TODO: Railway webhook URL로 요청 전송
    triggerPipeline(requestId, mediaId, petId, mood).catch((err) => {
      console.error("파이프라인 시작 실패:", err);
    });

    return NextResponse.json({
      requestId,
      estimatedSeconds: 180,
      status: "pending",
    });
  } catch (error) {
    console.error("Generate request error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}

/**
 * Railway 파이프라인 시작 (스텁)
 * TODO: 실제 Railway webhook URL로 교체
 */
async function triggerPipeline(
  requestId: string,
  mediaId: string,
  petId: string,
  mood: string
) {
  const railwayWebhookUrl = process.env.RAILWAY_WEBHOOK_URL;

  if (!railwayWebhookUrl) {
    console.warn("RAILWAY_WEBHOOK_URL 환경변수 없음");
    return;
  }

  await fetch(railwayWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId,
      mediaId,
      petId,
      mood,
    }),
  });
}
