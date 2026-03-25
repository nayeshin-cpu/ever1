"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface GenerationRequest {
  pet_id: string;
  output_media_id: string;
}

interface PetProfile {
  pet_name: string;
}

interface MediaAsset {
  r2_key_video_web: string;
}

export default function CompletePage() {
  const params = useParams();
  const requestId = params.requestId as string;
  const supabase = createBrowserSupabaseClient();

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [petId, setPetId] = useState<string>("");
  const [petName, setPetName] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // 영상 정보 조회
  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const { data: genReq } = await supabase
          .from("generation_requests")
          .select("pet_id, output_media_id")
          .eq("id", requestId)
          .single() as { data: GenerationRequest | null };

        if (!genReq?.output_media_id) return;

        setPetId(genReq.pet_id);

        // 반려동물 이름 조회
        const { data: pet } = await supabase
          .from("pet_profiles")
          .select("pet_name")
          .eq("id", genReq.pet_id)
          .single() as { data: PetProfile | null };

        if (pet) setPetName(pet.pet_name);

        // 영상 URL 조회
        const { data: media } = await supabase
          .from("media_assets")
          .select("r2_key_video_web")
          .eq("id", genReq.output_media_id)
          .single() as { data: MediaAsset | null };

        if (media?.r2_key_video_web) {
          const response = await fetch(`/api/upload/signed-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: media.r2_key_video_web }),
          });
          if (response.ok) {
            const { url } = await response.json();
            setVideoUrl(url);
          }
        }
      } catch (err) {
        console.error("영상 정보 조회 실패:", err);
      }
    };

    fetchVideoInfo();
  }, [requestId, supabase]);

  const handleDownload = async () => {
    if (!videoUrl || !petName) return;

    setIsDownloading(true);
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `everpet_${petName}_${today}.mp4`;

      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("다운로드 실패:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("링크가 복사되었어요!");
      setShowShareMenu(false);
    });
  };

  const handleKakaoShare = () => {
    // 카카오 공유 API (카카오 SDK가 로드되어 있다고 가정)
    if (typeof window !== "undefined" && (window as any).Kakao) {
      (window as any).Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `${petName}의 특별한 영상`,
          description: "EverPet에서 만든 우리 아이의 감성 영상입니다",
          imageUrl: videoUrl,
          link: {
            webUrl: window.location.href,
            mobileWebUrl: window.location.href,
          },
        },
        buttons: [
          {
            title: "영상 보기",
            link: {
              webUrl: window.location.href,
              mobileWebUrl: window.location.href,
            },
          },
        ],
      });
      setShowShareMenu(false);
    } else {
      alert("카카오톡 공유가 준비되지 않았습니다. 링크 복사를 사용해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* 상단 버튼 */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
        <Link
          href={`/generate?petId=${petId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white bg-opacity-10 text-white hover:bg-opacity-20 transition-all"
        >
          <span>←</span>
          <span>다시 만들기</span>
        </Link>
        <h1 className="text-white font-medium">{petName}의 영상</h1>
        <div className="w-20" /> {/* 정렬용 빈 공간 */}
      </div>

      {/* 비디오 플레이어 */}
      <div className="flex-1 flex items-center justify-center bg-black">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="max-w-full max-h-full"
          />
        ) : (
          <div className="text-white text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>영상을 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 sm:p-6 bg-black bg-opacity-50 space-y-3">
        <button
          onClick={handleDownload}
          disabled={!videoUrl || isDownloading}
          className="w-full px-4 py-3 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:bg-gray-400 transition-all"
        >
          {isDownloading ? "다운로드 중..." : "다운로드"}
        </button>

        <Link
          href="/videos"
          className="block w-full px-4 py-3 rounded-lg border border-white text-white font-medium text-center hover:bg-white hover:bg-opacity-10 transition-all"
        >
          보관함에 저장
        </Link>

        <div className="relative">
          <button
            onClick={handleShare}
            className="w-full px-4 py-3 rounded-lg border border-white text-white font-medium hover:bg-white hover:bg-opacity-10 transition-all"
          >
            공유하기
          </button>

          {/* 공유 메뉴 */}
          {showShareMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-gray-800 border border-gray-700 shadow-lg overflow-hidden z-50">
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-3 text-white hover:bg-gray-700 text-left flex items-center gap-3"
              >
                <span>🔗</span>
                <span>링크 복사</span>
              </button>
              <button
                onClick={handleKakaoShare}
                className="w-full px-4 py-3 text-white hover:bg-gray-700 text-left flex items-center gap-3 border-t border-gray-700"
              >
                <span>💬</span>
                <span>카카오톡 공유</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
