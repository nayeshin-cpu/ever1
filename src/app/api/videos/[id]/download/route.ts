import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2";

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

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const mediaId = params.id;

    // 미디어 조회
    const { data: media, error: mediaError } = await supabase
      .from("media_assets")
      .select("owner_id, r2_key_video_web")
      .eq("id", mediaId)
      .single();

    if (mediaError || !media) {
      return NextResponse.json(
        { error: "영상을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 권한 확인
    if (media.owner_id !== user.id) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    // TODO: 사용자 플랜 확인 및 워터마크 버전 선택
    // 현재는 원본 영상만 반환
    // Premium 플랜: r2_key_video_web
    // Free/Basic 플랜: r2_key_video_web_watermark (별도 생성 필요)

    if (!media.r2_key_video_web) {
      return NextResponse.json(
        { error: "다운로드 가능한 영상이 없습니다" },
        { status: 400 }
      );
    }

    // 서명된 URL 생성 (1시간 만료)
    const url = await getSignedDownloadUrl(media.r2_key_video_web);

    return NextResponse.json({
      url,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}
