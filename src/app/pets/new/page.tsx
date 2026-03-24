"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BODY_TYPES = ["소형", "중형", "대형"] as const;
const AGE_GROUPS = ["퍼피", "성견", "노견"] as const;
const GENDERS = ["남아", "여아"] as const;

const ENERGY_LEVELS = [
  { value: "high", label: "항상 신나있고 활발했어요" },
  { value: "medium", label: "보통이었어요" },
  { value: "low", label: "조용하고 차분했어요" },
] as const;

const PERSONALITY_TAGS = [
  { key: "tail_wag", label: "꼬리를 엄청 세게 흔들었어요", icon: "🐕" },
  { key: "follow_owner", label: "항상 졸졸 따라다녔어요", icon: "🐾" },
  { key: "play_fetch", label: "공·장난감을 물어오는 걸 좋아했어요", icon: "🎾" },
  { key: "food_motivated", label: "밥·간식 앞에서 특히 신났어요", icon: "🍖" },
  { key: "social_stranger", label: "낯선 사람한테도 먼저 달려갔어요", icon: "👋" },
  { key: "calm_presence", label: "조용히 옆에 있는 걸 좋아했어요", icon: "😌" },
  { key: "sniff_focused", label: "산책 나가면 코를 바닥에 박았어요", icon: "👃" },
  { key: "recall_response", label: "이름 부르면 바로 달려왔어요", icon: "📣" },
] as const;

const MAX_PERSONALITY_TAGS = 3;

export default function NewPetPage() {
  const router = useRouter();

  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDeceased, setIsDeceased] = useState(false);
  const [deceasedAt, setDeceasedAt] = useState("");
  const [toast, setToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTagToggle(key: string) {
    if (selectedTags.includes(key)) {
      setSelectedTags(selectedTags.filter((t) => t !== key));
      return;
    }
    if (selectedTags.length >= MAX_PERSONALITY_TAGS) {
      setToast("최대 3개까지 선택할 수 있어요");
      setTimeout(() => setToast(""), 2000);
      return;
    }
    setSelectedTags([...selectedTags, key]);
  }

  async function handleSubmit() {
    if (!petName.trim()) {
      setToast("반려동물 이름을 입력해 주세요");
      setTimeout(() => setToast(""), 2000);
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pet_name: petName,
        species: "dog",
        breed: breed || null,
        body_type: bodyType || null,
        age_group: ageGroup || null,
        energy_level: energyLevel || null,
        personality_tags: selectedTags,
        is_deceased: isDeceased,
        deceased_at: isDeceased && deceasedAt ? deceasedAt : null,
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setToast(data.error || "등록에 실패했습니다");
      setTimeout(() => setToast(""), 2000);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          반려동물 등록
        </h1>

        {/* 섹션 1: 기본 정보 */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            기본 정보
          </h2>

          {/* 이름 */}
          <label className="mb-1 block text-sm font-medium text-gray-700">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="반려동물 이름"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />

          {/* 품종 */}
          <label className="mb-1 block text-sm font-medium text-gray-700">
            품종
          </label>
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="품종을 입력하세요"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />

          {/* 체형 */}
          <label className="mb-2 block text-sm font-medium text-gray-700">
            체형
          </label>
          <div className="mb-4 flex gap-2">
            {BODY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBodyType(type)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  bodyType === type
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 나이 */}
          <label className="mb-2 block text-sm font-medium text-gray-700">
            나이
          </label>
          <div className="mb-4 flex gap-2">
            {AGE_GROUPS.map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => setAgeGroup(age)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  ageGroup === age
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {age}
              </button>
            ))}
          </div>

          {/* 성별 */}
          <label className="mb-2 block text-sm font-medium text-gray-700">
            성별
          </label>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  gender === g
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* 섹션 2: 행동 특성 */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            우리 아이는 어떤 아이였나요?
          </h2>

          {/* 에너지 레벨 */}
          <p className="mb-2 text-sm font-medium text-gray-700">에너지 레벨</p>
          <div className="mb-6 space-y-2">
            {ENERGY_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex cursor-pointer items-center rounded-lg border px-4 py-3 transition ${
                  energyLevel === level.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="energyLevel"
                  value={level.value}
                  checked={energyLevel === level.value}
                  onChange={() => setEnergyLevel(level.value)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-800">{level.label}</span>
              </label>
            ))}
          </div>

          {/* 성격 키워드 */}
          <p className="mb-1 text-sm font-medium text-gray-700">
            성격 키워드 (최대 3개)
          </p>
          <p className="mb-3 text-xs text-gray-500">
            선택하지 않아도 진행할 수 있어요
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PERSONALITY_TAGS.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => handleTagToggle(tag.key)}
                className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                  selectedTags.includes(tag.key)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="mb-1 block text-lg">{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </section>

        {/* 섹션 3: 무지개다리 */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
              무지개다리를 건넜어요
            </span>
            <button
              type="button"
              onClick={() => setIsDeceased(!isDeceased)}
              className={`relative h-6 w-11 rounded-full transition ${
                isDeceased ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  isDeceased ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          {isDeceased && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                기일
              </label>
              <input
                type="date"
                value={deceasedAt}
                onChange={(e) => setDeceasedAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </section>

        {/* 등록 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "등록 중..." : "등록 완료"}
        </button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
