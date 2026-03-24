import Anthropic from "@anthropic-ai/sdk";

export interface PetBehaviorProfile {
  breed: string;
  bodyType: "small" | "medium" | "large";
  coatColorHex: string[];
  ageGroup: "puppy" | "adult" | "senior";
  energy: "high" | "medium" | "low";
  personalityTags: string[];
}

export type MoodPreset = "active" | "cozy" | "calm";

interface MotionParams {
  breed: string;
  bodyType: string;
  coatDescription: string;
  ageDescription: string;
  tailMotion: string;
  posture: string;
  movement: string;
  extras: string[];
}

const COAT_COLOR_MAP: Record<string, string> = {
  "#FFFFFF": "white",
  "#000000": "black",
  "#8B4513": "brown",
  "#FFD700": "golden",
  "#D2B48C": "tan",
  "#808080": "gray",
  "#FF8C00": "orange",
  "#F5F5DC": "cream",
};

function hexToColorName(hex: string): string {
  return COAT_COLOR_MAP[hex.toUpperCase()] || "mixed-color";
}

const AGE_MAP: Record<string, string> = {
  puppy: "young puppy",
  adult: "adult",
  senior: "senior elderly",
};

/**
 * 1단계: 규칙 기반 파라미터 추출
 */
export function extractMotionParams(
  profile: PetBehaviorProfile,
  mood: MoodPreset
): MotionParams {
  const tailMotion = profile.personalityTags.includes("tail_wag_strong")
    ? "vigorously"
    : "gently";

  let posture: string;
  if (profile.energy === "high") {
    posture = "forward-leaning, excited";
  } else if (profile.energy === "low") {
    posture = "relaxed, calm";
  } else {
    posture = "natural, alert";
  }

  let movement: string;
  if (mood === "active") {
    movement = "trotting, bouncing";
  } else if (mood === "cozy") {
    movement = "lying down, resting";
  } else {
    movement = "sitting quietly, serene";
  }

  const extras: string[] = [];
  if (profile.personalityTags.includes("follow_owner")) {
    extras.push("facing owner eagerly");
  }
  if (profile.personalityTags.includes("belly_show")) {
    extras.push("occasionally showing belly");
  }
  if (profile.personalityTags.includes("head_tilt")) {
    extras.push("tilting head curiously");
  }
  if (profile.personalityTags.includes("zoomies")) {
    extras.push("bursting with sudden energy");
  }

  const coatColors = profile.coatColorHex.map(hexToColorName);
  const coatDescription =
    coatColors.length > 0 ? coatColors.join(" and ") : "natural-colored";

  return {
    breed: profile.breed,
    bodyType: profile.bodyType,
    coatDescription,
    ageDescription: AGE_MAP[profile.ageGroup] || "adult",
    tailMotion,
    posture,
    movement,
    extras,
  };
}

/**
 * 2단계: Claude API로 최종 프롬프트 생성
 */
export async function generatePromptWithClaude(
  params: MotionParams
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt =
    "당신은 반려동물 AI 영상 생성 프롬프트 전문가입니다. 주어진 파라미터를 Kling AI image-to-video에 최적화된 영어 프롬프트로 변환하세요. 반드시 120토큰 이내로 작성하고, 배경은 항상 pure black, hologram display optimized를 명시하세요.";

  const userMessage = `아래 파라미터를 기반으로 영어 프롬프트를 생성해주세요:

- 품종: ${params.breed}
- 체형: ${params.bodyType}
- 털색: ${params.coatDescription}
- 나이: ${params.ageDescription}
- 꼬리 움직임: wagging tail ${params.tailMotion}
- 자세: ${params.posture}
- 동작: ${params.movement}
${params.extras.length > 0 ? `- 추가 동작: ${params.extras.join(", ")}` : ""}

프롬프트만 출력하세요. 다른 설명은 불필요합니다.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

/**
 * 최종 함수: 1단계 → 2단계 순서로 실행하여 프롬프트 반환
 */
export async function buildGenerationPrompt(
  profile: PetBehaviorProfile,
  mood: MoodPreset
): Promise<string> {
  const params = extractMotionParams(profile, mood);
  const prompt = await generatePromptWithClaude(params);
  return prompt;
}
