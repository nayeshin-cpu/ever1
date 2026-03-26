"use client";

import { useState, useEffect } from "react";

interface Subscription {
  id: string;
  plan_type: "free" | "basic" | "premium";
  status: "active" | "paused" | "cancelled" | "expired";
  monthly_generation_limit: number;
  monthly_generation_used: number;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
}

interface Plan {
  type: "free" | "basic" | "premium";
  name: string;
  price: number;
  limit: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    type: "free",
    name: "Free",
    price: 0,
    limit: 1,
    features: [
      "매달 1개 영상 생성",
      "최근 3개 영상 보기",
      "워터마크 포함",
      "기본 지원",
    ],
  },
  {
    type: "basic",
    name: "Basic",
    price: 9900,
    limit: 4,
    features: [
      "매달 4개 영상 생성",
      "모든 영상 보기",
      "워터마크 포함",
      "이메일 지원",
    ],
  },
  {
    type: "premium",
    name: "Premium",
    price: 19900,
    limit: 9999,
    features: [
      "무제한 영상 생성",
      "모든 영상 보기",
      "워터마크 제거",
      "우선 지원",
    ],
  },
];

interface CancelModalProps {
  isOpen: boolean;
  subscription: Subscription | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function CancelModal({
  isOpen,
  subscription,
  onConfirm,
  onCancel,
}: CancelModalProps) {
  if (!isOpen || !subscription) return null;

  const endDate = new Date(subscription.current_period_end);
  const formattedDate = endDate.toLocaleDateString("ko-KR");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          구독을 취소하시겠어요?
        </h2>
        <p className="text-gray-600 mb-6">
          {formattedDate}까지는 계속 이용할 수 있어요. 이후 무료 플랜으로
          전환됩니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            계속 이용하기
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600"
          >
            취소하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscriptions");
        if (response.ok) {
          const data = (await response.json()) as Subscription;
          setSubscription(data);
        }
      } catch (err) {
        console.error("구독 정보 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    try {
      const response = await fetch("/api/subscriptions", { method: "DELETE" });
      if (response.ok) {
        setShowCancelModal(false);
        // 구독 정보 새로고침
        const newResponse = await fetch("/api/subscriptions");
        if (newResponse.ok) {
          const data = (await newResponse.json()) as Subscription;
          setSubscription(data);
        }
      }
    } catch (err) {
      console.error("구독 취소 실패:", err);
    }
  };

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

  if (!subscription) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">구독 정보를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const currentPlan = PLANS.find((p) => p.type === subscription.plan_type);
  const endDate = new Date(subscription.current_period_end);
  const usagePercent =
    (subscription.monthly_generation_used /
      subscription.monthly_generation_limit) *
    100;

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-200 px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900">구독 관리</h1>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {/* 현재 플랜 정보 */}
        {currentPlan && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentPlan.name} 플랜
              </h2>
              <p className="text-amber-700 font-medium">
                {currentPlan.price > 0 ? `₩${currentPlan.price.toLocaleString()}` : "무료"}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              다음 결제일: {endDate.toLocaleDateString("ko-KR")}
            </p>
          </div>
        )}

        {/* 사용량 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            이번 달 사용량
          </h3>
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-2">
              {subscription.monthly_generation_used}회 사용 /{" "}
              {subscription.monthly_generation_limit === 9999
                ? "무제한"
                : `${subscription.monthly_generation_limit}회 가능`}
            </p>
            {subscription.monthly_generation_limit !== 9999 && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 플랜 비교 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            플랜 비교
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.type}
                className={`rounded-lg border p-4 ${
                  plan.type === subscription.plan_type
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h4>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  {plan.price > 0 ? `₩${plan.price.toLocaleString()}` : "무료"}
                  {plan.price > 0 && <span className="text-sm text-gray-600">/월</span>}
                </p>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.type !== subscription.plan_type && (
                  <button
                    disabled
                    className="w-full px-3 py-2 rounded-lg bg-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed"
                  >
                    준비 중
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 구독 해지 */}
        {subscription.status !== "cancelled" && (
          <div className="border-t border-gray-200 pt-8 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              구독 해지
            </h3>
            <p className="text-gray-600 mb-4">
              언제든지 구독을 해지할 수 있습니다.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50"
            >
              구독 해지하기
            </button>
          </div>
        )}
      </div>

      {/* 취소 모달 */}
      <CancelModal
        isOpen={showCancelModal}
        subscription={subscription}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
}
