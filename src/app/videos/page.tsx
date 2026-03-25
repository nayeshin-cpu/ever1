"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Video {
  id: string;
  petId: string;
  petName: string;
  createdAt: string;
  thumbnailUrl: string;
  videoUrl: string;
}

interface PetProfile {
  id: string;
  pet_name: string;
}

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

function VideoModal({ video, onClose }: VideoModalProps) {
  if (!video) return null;

  const handleDownload = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `everpet_${video.petName}_${today}.mp4`;

      const a = document.createElement("a");
      a.href = video.videoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("다운로드 실패:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-black rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
        >
          ✕
        </button>

        {/* 비디오 */}
        <div className="aspect-video bg-black">
          <video
            src={video.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full"
          />
        </div>

        {/* 하단 정보 및 버튼 */}
        <div className="bg-gray-900 p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">{video.petName}</p>
            <p className="text-gray-400 text-sm">
              {new Date(video.createdAt).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-all"
          >
            다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const supabase = createBrowserSupabaseClient();

  const [videos, setVideos] = useState<Video[]>([]);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>("free");

  // 반려동물 목록 및 영상 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 반려동물 목록
        const { data: petsData } = await supabase
          .from("pet_profiles")
          .select("id, pet_name")
          .order("created_at");

        if (petsData) setPets(petsData);

        // 영상 목록
        const response = await fetch("/api/videos");
        if (response.ok) {
          const { videos: videosData } = await response.json();
          setVideos(videosData);
        }

        // 사용자 플랜 (TODO: 실제 구독 정보 조회)
        setUserPlan("free"); // 임시로 free로 설정
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const filteredVideos =
    selectedPetId === "all"
      ? videos
      : videos.filter((v) => v.petId === selectedPetId);

  const maxFreeVideos = 3;
  const isFreeUser = userPlan === "free";

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">영상 보관함</h1>
          <p className="mt-2 text-gray-600">우리 아이의 감성 영상을 모아봅시다</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-4">
            <button
              onClick={() => setSelectedPetId("all")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedPetId === "all"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              전체
            </button>
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedPetId === pet.id
                    ? "bg-amber-100 text-amber-700"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {pet.pet_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
            <p className="text-gray-600">영상을 불러오는 중...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              아직 생성된 영상이 없어요
            </h2>
            <p className="text-gray-600">영상을 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => {
              const isBlurred = isFreeUser && index >= maxFreeVideos;

              return (
                <div
                  key={video.id}
                  className={`relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer ${
                    isBlurred ? "opacity-60" : ""
                  }`}
                  onClick={() => !isBlurred && setSelectedVideo(video)}
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.petName}
                    className={`w-full aspect-square object-cover ${
                      isBlurred ? "blur-md" : "group-hover:scale-105"
                    } transition-all`}
                  />

                  {/* 오버레이 정보 */}
                  {!isBlurred && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-end p-4">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-all w-full">
                        <p className="font-semibold">{video.petName}</p>
                        <p className="text-sm text-gray-200">
                          {new Date(video.createdAt).toLocaleDateString(
                            "ko-KR"
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 유료 플랜 잠금 */}
                  {isBlurred && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                      <p className="text-white font-semibold text-center px-4 mb-3">
                        구독하면 모든 영상을 볼 수 있어요
                      </p>
                      <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                        업그레이드
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 비디오 모달 */}
      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}
