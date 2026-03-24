import { klingGenerateAndWait } from "./kling";
import { falGenerate } from "./fal";

/**
 * 영상 생성 통합 함수
 * Kling AI를 먼저 시도하고, 실패 시 Fal.ai로 자동 전환
 */
export async function generateVideo(
  rimlightImageUrl: string,
  prompt: string
): Promise<{ url: string; provider: "kling" | "fal" }> {
  // 1차: Kling AI 시도
  try {
    console.log("[VideoGen] Kling AI로 영상 생성 시도");
    const url = await klingGenerateAndWait(rimlightImageUrl, prompt);
    console.log("[VideoGen] Kling AI 성공");
    return { url, provider: "kling" };
  } catch (klingError) {
    console.warn(
      "[VideoGen] Kling AI 실패, Fal.ai로 전환:",
      klingError instanceof Error ? klingError.message : klingError
    );
  }

  // 2차: Fal.ai 폴백
  try {
    console.log("[VideoGen] Fal.ai로 영상 생성 시도");
    const url = await falGenerate(rimlightImageUrl, prompt);
    console.log("[VideoGen] Fal.ai 성공");
    return { url, provider: "fal" };
  } catch (falError) {
    console.error(
      "[VideoGen] Fal.ai도 실패:",
      falError instanceof Error ? falError.message : falError
    );
    throw new Error("모든 영상 생성 서비스 실패");
  }
}
