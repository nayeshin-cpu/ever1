"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PhotoUploadZone from "@/components/PhotoUploadZone";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Mood = "cozy" | "active" | "calm";

interface MoodOption {
  value: Mood;
  name: string;
  description: string;
  icon: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    value: "cozy",
    name: "포근한",
    description: "쉬거나 옆에 있는 모습",
    icon: "🛏️",
  },
  {
    value: "active",
    name: "활발한",
    description: "뛰거나 신나게 노는 모습",
    icon: "🏃",
  },
  {
    value: "calm",
    name: "조용한",
    description: "멀리서 바라보는 차분한 모습",
    icon: "🤫",
  },
];

interface PetProfile {
  id: string;
  pet_name: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [pets, setPets] = useState<PetProfile[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [uploadedMediaId, setUploadedMediaId] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // 반려동물 목록 조회
  useEffect(() => {
    const fetchPets = async () => {
      const { data, error } = await supabase
        .from("pet_profiles")
        .select("id, pet_name")
        .order("created_at");

      if (!error && data) {
        setPets(data);
        if (data.length > 0) {
          setSelectedPetId(data[0].id);
        }
      }
    };

    fetchPets();
  }, [supabase]);

  const handleUploadComplete = (mediaId: string) => {
    setUploadedMediaId(mediaId);
    setError("");
  };

  const handleGenerateClick = async () => {
    if (!selectedPetId || !uploadedMediaId || !selectedMood) {
      setError("모든 항목을 선택해주세요");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: selectedPetId,
          mediaId: uploadedMediaId,
          mood: selectedMood,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "생성 요청 실패");
      }

      const { requestId } = await response.json();
      router.push(`/generate/${requestId}/progress`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 처리 중 오류 발생");
      setIsLoading(false);
    }
  };

  const isButtonEnabled = uploadedMediaId && selectedMood && !isLoading;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">영상 만들기</h1>
          <p className="mt-2 text-gray-600">우리 아이의 특별한 모습을 만나보세요</p>
        </div>

        {/* 반려동물 선택 (여러 마리인 경우만 표시) */}
        {pets.length > 1 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              어느 아이의 영상을 만들까요?
            </label>
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.pet_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 사진 업로드 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            사진 선택
          </h2>
          {selectedPetId && (
            <PhotoUploadZone
              petId={selectedPetId}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </div>

        {/* 무드 선택 (사진 업로드 후에만 표시) */}
        {uploadedMediaId && (
          <div className="mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              오늘 밤 어떤 모습으로 만날까요?
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`rounded-lg border-2 p-4 text-center transition-all ${
                    selectedMood === mood.value
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="text-4xl mb-2">{mood.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {mood.name}
                  </h3>
                  <p className="text-xs text-gray-600">{mood.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 생성 시작 버튼 */}
        <button
          onClick={handleGenerateClick}
          disabled={!isButtonEnabled}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
            isButtonEnabled
              ? "bg-amber-500 text-white hover:bg-amber-600 active:scale-95"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? "생성 시작 중..." : "생성 시작"}
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
