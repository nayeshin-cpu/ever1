import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2";

type Status = "pending" | "preprocessing" | "generating" | "encoding" | "done" | "failed";

const STATUS_LABELS: Record<Status, string> = {
  pending: "요청 대기 중",
  preprocessing: "사진 준비 중",
  generating: "영상 생성 중",
  encoding: "인코딩 중",
  done: "완료",
  failed: "실패",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const requestId = params.id;

    // 임시: 비회원 UI 테스트용 모바일 시뮬레이션
    if (!user && requestId === "mock-request-1") {
      const seconds = Math.floor(Date.now() / 1000) % 20;
      if (seconds < 5) {
        return NextResponse.json({ status: "preprocessing", progress: 20, stepLabel: "사진 준비 중" });
      } else if (seconds < 10) {
        return NextResponse.json({ status: "generating", progress: 50, stepLabel: "영상 생성 중" });
      } else if (seconds < 15) {
        return NextResponse.json({ status: "encoding", progress: 90, stepLabel: "인코딩 중" });
      } else {
        return NextResponse.json({
          status: "done",
          progress: 100,
          stepLabel: "완료",
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          thumbnailUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400"
        });
      }
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // generation_requests 조회
    const { data: genReq, error: queryError } = await supabase
      .from("generation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (queryError || !genReq) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 현재 사용자의 요청인지 확인
    if (genReq.user_id !== user.id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    const status = genReq.status as Status;
    const response: {
      status: Status;
      progress: number;
      stepLabel: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      errorMessage?: string;
    } = {
      status,
      progress: genReq.progress ?? 0,
      stepLabel: STATUS_LABELS[status],
    };

    // done 상태: 영상 URL과 썸네일 URL 반환
    if (status === "done" && genReq.output_media_id) {
      const { data: media, error: mediaError } = await supabase
        .from("media_assets")
        .select("r2_key_video_web, r2_key_thumbnail")
        .eq("id", genReq.output_media_id)
        .single();

      if (!mediaError && media) {
        if (media.r2_key_video_web) {
          response.videoUrl = await getSignedDownloadUrl(media.r2_key_video_web);
        }
        if (media.r2_key_thumbnail) {
          response.thumbnailUrl = await getSignedDownloadUrl(
            media.r2_key_thumbnail
          );
        }
      }
    }

    // failed 상태: 에러 메시지 반환
    if (status === "failed") {
      response.errorMessage = genReq.error_message || "영상 생성에 실패했습니다";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "상태 확인 실패" },
      { status: 500 }
    );
  }
}
