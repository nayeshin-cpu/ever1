"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Plan {
  type: "free" | "basic" | "premium";
  name: string;
  price: number;
  limit: number;
  description: string;
}

const PLANS: Plan[] = [
  {
    type: "free",
    name: "Free",
    price: 0,
    limit: 1,
    description: "매달 1개의 영상을 만들어보세요",
  },
  {
    type: "basic",
    name: "Basic",
    price: 9900,
    limit: 4,
    description: "매달 4개의 영상으로 추억을 남겨보세요",
  },
  {
    type: "premium",
    name: "Premium",
    price: 19900,
    limit: 9999,
    description: "무제한으로 우리 아이와 만나보세요",
  },
];

export default function HomePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkAuth();
  }, [supabase]);

  const handleCTA = () => {
    /* 임시: 로그인 없이 바로 테스트 가능하도록 signup 대신 dashboard로 이동
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
    */
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-600">EverPet</h1>
          {!isLoggedIn && (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium"
              >
                가입하기
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* 텍스트 */}
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
                우리 아이를<br />
                <span className="text-amber-600">다시 만나보세요</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                사진 한 장으로 우리 아이의 특별한 순간들을 AI 영상으로 되살려낼 수 있어요.
                행동 특성과 무드를 담아 감성적인 영상을 만들어보세요.
              </p>
              <button
                onClick={handleCTA}
                className="px-8 py-4 rounded-lg bg-amber-500 text-white font-bold text-lg hover:bg-amber-600 active:scale-95 transition-all shadow-lg"
              >
                무료로 시작하기
              </button>
            </div>

            {/* 영상/이미지 플레이스홀더 */}
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-6xl shadow-xl">
              🎬
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 소개 */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-16">
            EverPet만의 특별함
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 기능 1 */}
            <div className="text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                사진 한 장으로 충분해요
              </h3>
              <p className="text-gray-600">
                가장 사랑스러운 우리 아이의 사진 한 장만으로 영상을 만들 수 있어요.
              </p>
            </div>

            {/* 기능 2 */}
            <div className="text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                우리 아이만의 개성을 담아요
              </h3>
              <p className="text-gray-600">
                행동 특성과 에너지, 성격을 선택하면 AI가 우리 아이만의 독특한 영상을
                만들어요.
              </p>
            </div>

            {/* 기능 3 */}
            <div className="text-center">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                방 안에서 다시 만나요
              </h3>
              <p className="text-gray-600">
                언제든 보관함에서 우리 아이의 영상을 꺼내 감정을 나눠보세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 구독 플랜 */}
      <section className="bg-gray-50 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            플랜을 선택하세요
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            어떤 플랜이든 EverPet의 감성적인 영상 생성 기술을 경험할 수 있어요
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.type}
                className={`rounded-lg border-2 p-8 text-center transition-all ${plan.type === "premium"
                    ? "border-amber-500 bg-white shadow-xl scale-105"
                    : "border-gray-200 bg-white"
                  }`}
              >
                {plan.type === "premium" && (
                  <div className="text-amber-500 font-bold text-sm mb-4">
                    인기 플랜 ⭐
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price > 0 ? `₩${plan.price.toLocaleString()}` : "무료"}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 ml-2">/월</span>
                  )}
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-2xl font-bold text-amber-600 mb-2">
                    {plan.limit === 9999 ? "무제한" : `월 ${plan.limit}개`}
                  </p>
                  <p className="text-sm text-gray-600">영상 생성</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={handleCTA}
              className="px-8 py-4 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all inline-block"
            >
              지금 시작하기
            </button>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-4">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    시작하기
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    가격
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">정책</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    개인정보처리방침
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">지원</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    고객지원
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    피드백
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">연락처</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>support@everpet.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2026 EverPet. 우리 아이와의 추억을 간직하세요.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
