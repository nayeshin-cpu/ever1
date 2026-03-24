"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Pet {
  id: string;
  pet_name: string;
  breed: string;
  r2_key_original?: string;
}

interface Video {
  id: string;
  petName: string;
  createdAt: string;
  thumbnailUrl: string;
}

interface Subscription {
  monthly_generation_limit: number;
  monthly_generation_used: number;
}

interface SelectPetModalProps {
  isOpen: boolean;
  pets: Pet[];
  onSelect: (petId: string) => void;
  onClose: () => void;
}

function SelectPetModal({ isOpen, pets, onSelect, onClose }: SelectPetModalProps) {
  if (!isOpen || pets.length === 0) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          어느 아이의 영상을 만들까요?
        </h2>
        <div className="space-y-2">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => {
                onSelect(pet.id);
                onClose();
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-medium text-gray-900"
            >
              {pet.pet_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [pets, setPets] = useState<Pet[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 반려동물 목록 조회
        const { data: petsData } = await supabase
          .from("pet_profiles")
          .select("id, pet_name, breed")
          .order("created_at");

        setPets(petsData || []);

        // 구독 정보 조회
        const subResponse = await fetch("/api/subscriptions");
        if (subResponse.ok) {
          const subData = (await subResponse.json()) as Subscription;
          setSubscription(subData);
        }

        // 최근 영상 3개 조회
        const videosResponse = await fetch("/api/videos");
        if (videosResponse.ok) {
          const { videos: videosData } = await videosResponse.json();
          setVideos(videosData.slice(0, 3));
        }
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleFAB = () => {
    if (pets.length === 0) {
      router.push("/pets/new");
    } else if (pets.length === 1) {
      router.push(`/generate?petId=${pets[0].id}`);
    } else {
      setShowPetModal(true);
    }
  };

  const handleSelectPet = (petId: string) => {
    router.push(`/generate?petId=${petId}`);
  };

  const remainingGenerations =
    subscription &&
    Math.max(
      0,
      subscription.monthly_generation_limit - subscription.monthly_generation_used
    );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* 상단 프로그레스 */}
      {subscription && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-gray-600 mb-2">이번 달</p>
            <p className="text-2xl font-bold text-gray-900 mb-4">
              {remainingGenerations}회 남았어요
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all"
                style={{
                  width: `${
                    (subscription.monthly_generation_used /
                      subscription.monthly_generation_limit) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* 반려동물 카드 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">우리 아이들</h2>
            {pets.length > 0 && (
              <Link
                href="/pets/new"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                + 추가
              </Link>
            )}
          </div>

          {pets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-4xl mb-4">🐾</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                아이를 등록해보세요
              </h3>
              <p className="text-gray-600 mb-6">
                반려동물 정보를 등록하면 맞춤형 영상을 만들 수 있어요
              </p>
              <Link
                href="/pets/new"
                className="inline-block px-6 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
              >
                등록하기
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => router.push(`/generate?petId=${pet.id}`)}
                  className="flex-shrink-0 w-48 rounded-lg overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden relative">
                    {/* 플레이스홀더 이미지 */}
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                      🐕
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <p className="font-semibold text-gray-900 truncate">
                      {pet.pet_name}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{pet.breed}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 최근 영상 */}
        {videos.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">최근 만든 영상</h2>
              <Link
                href="/videos"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                모두 보기
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {videos.map((video) => (
                <Link
                  key={video.id}
                  href="/videos"
                  className="rounded-lg overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden relative">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.petName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {video.petName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(video.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={handleFAB}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center text-2xl z-40"
      >
        +
      </button>

      {/* 반려동물 선택 모달 */}
      <SelectPetModal
        isOpen={showPetModal}
        pets={pets}
        onSelect={handleSelectPet}
        onClose={() => setShowPetModal(false)}
      />
    </div>
  );
}
