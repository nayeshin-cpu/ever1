import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2";

interface VideoItem {
  id: string;
  petId: string;
  petName: string;
  createdAt: string;
  thumbnailUrl: string;
  videoUrl: string;
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // 임시: 비회원 UI 테스트용 모의 영상 반환
      return NextResponse.json({
        videos: [
          {
            id: "mock-video-1",
            petId: "mock-pet-1",
            petName: "콩이",
            createdAt: new Date().toISOString(),
            thumbnailUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
          }
        ]
      });
    }

    // 완료된 생성 요청 조회 (최신순)
    const { data: generationRequests, error: queryError } = await supabase
      .from("generation_requests")
      .select(
        `
        id,
        pet_id,
        created_at,
        output_media_id,
        pet_profiles:pet_id(pet_name)
      `
      )
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false });

    if (queryError) {
      return NextResponse.json(
        { error: "데이터 조회 실패" },
        { status: 500 }
      );
    }

    // 각 요청의 썸네일 URL 조회
    const videos: VideoItem[] = [];

    for (const req of generationRequests || []) {
      if (!req.output_media_id) continue;

      const { data: media } = await supabase
        .from("media_assets")
        .select("r2_key_thumbnail, r2_key_video_web")
        .eq("id", req.output_media_id)
        .single();

      if (!media) continue;

      try {
        const thumbnailUrl = media.r2_key_thumbnail
          ? await getSignedDownloadUrl(media.r2_key_thumbnail)
          : "";

        const videoUrl = media.r2_key_video_web
          ? await getSignedDownloadUrl(media.r2_key_video_web)
          : "";

        videos.push({
          id: req.id,
          petId: req.pet_id,
          petName: (req.pet_profiles as unknown as { pet_name: string })?.pet_name || "반려동물",
          createdAt: req.created_at,
          thumbnailUrl,
          videoUrl,
        });
      } catch (err) {
        console.error("URL 서명 실패:", err);
        continue;
      }
    }

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Videos API error:", error);
    return NextResponse.json(
      { error: "요청 처리 실패" },
      { status: 500 }
    );
  }
}
