"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type GenerationStatus =
  | "pending"
  | "preprocessing"
  | "generating"
  | "encoding"
  | "done"
  | "failed";

interface StatusResponse {
  status: GenerationStatus;
  progress: number;
  stepLabel: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

const STATUS_MESSAGES: Record<GenerationStatus, string> = {
  pending: "잠깐만요, 준비하고 있어요",
  preprocessing: "사진 준비 중이에요",
  generating: "을(를) 만들고 있어요 🐾",
  encoding: "거의 다 됐어요!",
  done: "완료!",
  failed: "오늘은 만들기가 어렵네요",
};

const PROGRESS_STAGES = [
  { stage: 1, label: "준비", threshold: 30 },
  { stage: 2, label: "생성", threshold: 70 },
  { stage: 3, label: "마무리", threshold: 100 },
];

export default function ProgressPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;
  const supabase = createBrowserSupabaseClient();

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [petName, setPetName] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [showEmailBanner, setShowEmailBanner] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 생성 요청 정보와 사진 데이터 조회
  useEffect(() => {
    const fetchGenerationInfo = async () => {
      try {
        const { data: genReq } = await supabase
          .from("generation_requests")
          .select("pet_id, input_media_id")
          .eq("id", requestId)
          .single();

        if (!genReq) return;

        // 반려동물 정보 조회
        const { data: pet } = await supabase
          .from("pet_profiles")
          .select("pet_name")
          .eq("id", genReq.pet_id)
          .single();

        if (pet) setPetName(pet.pet_name);

        // 사진 정보 조회
        const { data: media } = await supabase
          .from("media_assets")
          .select("r2_key_original")
          .eq("id", genReq.input_media_id)
          .single();

        if (media?.r2_key_original) {
          // 서명된 URL 받기
          const response = await fetch(`/api/upload/signed-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: media.r2_key_original }),
          });
          if (response.ok) {
            const { url } = await response.json();
            setPhotoUrl(url);
          }
        }
      } catch (err) {
        console.error("정보 조회 실패:", err);
      }
    };

    fetchGenerationInfo();
  }, [requestId, supabase]);

  // 상태 폴링
  useEffect(() => {
    if (!requestId) return;

    let pollInterval: NodeJS.Timeout;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/generate/${requestId}/status`);
        if (!response.ok) return;

        const data = (await response.json()) as StatusResponse;
        if (isMounted) {
          setStatus(data);

          // done 상태면 완료 페이지로 자동 이동
          if (data.status === "done") {
            clearInterval(pollInterval);
            setTimeout(() => {
              router.push(`/generate/${requestId}/complete`);
            }, 1000);
          }

          // failed 상태면 폴링 중지
          if (data.status === "failed") {
            clearInterval(pollInterval);
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error("상태 조회 실패:", err);
      }
    };

    // 초기 조회
    fetchStatus();

    // 3초마다 폴링
    pollInterval = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [requestId, router]);

  if (isLoading || !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 실패 상태
  if (status.status === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {STATUS_MESSAGES.failed}
          </h1>
          <p className="text-gray-600 mb-6">
            크레딧은 돌려드릴게요. 나중에 다시 시도해보세요.
          </p>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-3 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  // 진행 중 상태
  const progress = status.progress || 0;
  const currentStage = PROGRESS_STAGES.findIndex(
    (s) => progress <= s.threshold
  );
  const activeStage = currentStage === -1 ? 3 : currentStage + 1;

  const displayMessage =
    status.status === "generating" && petName
      ? `${petName}${STATUS_MESSAGES.generating}`
      : STATUS_MESSAGES[status.status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex flex-col">
      {/* 이메일 알림 배너 */}
      {showEmailBanner && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-900">
            완료 시 이메일로 알려드릴까요?
          </p>
          <button
            onClick={() => setShowEmailBanner(false)}
            className="text-amber-600 hover:text-amber-800 font-medium text-sm"
          >
            닫기
          </button>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full">
          {/* 사진 표시 */}
          {photoUrl && (
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <img
                src={photoUrl}
                alt="반려동물 사진"
                className="w-full h-80 object-cover"
              />
            </div>
          )}

          {/* 감성 문구 */}
          <div className="text-center mb-8">
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 leading-relaxed">
              {displayMessage}
            </p>
          </div>

          {/* 3단계 프로그레스 바 */}
          <div className="mb-8">
            <div className="flex justify-between items-end gap-2">
              {PROGRESS_STAGES.map((stage) => {
                const isActive = activeStage >= stage.stage;
                const isComplete = activeStage > stage.stage;

                return (
                  <div key={stage.stage} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-full h-3 rounded-full transition-all ${
                        isComplete
                          ? "bg-green-500"
                          : isActive
                            ? "bg-amber-500"
                            : "bg-gray-200"
                      }`}
                    />
                    <p
                      className={`text-xs font-medium ${
                        isActive ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 예상 시간 */}
          <div className="text-center mb-8">
            <p className="text-gray-600 text-sm">
              약 {Math.max(1, Math.ceil((100 - progress) / 33))}분 남았어요
            </p>
          </div>

          {/* 진행률 텍스트 */}
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
