import { fal } from "@fal-ai/client";

// Fal.ai 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY,
});

interface FalResult {
  video: {
    url: string;
  };
}

/**
 * Fal.ai image-to-video 영상 생성 (Kling 폴백용)
 */
export async function falGenerate(
  rimlightImageUrl: string,
  prompt: string
): Promise<string> {
  const result = await fal.subscribe("fal-ai/kling-video/v1/standard/image-to-video", {
    input: {
      prompt,
      image_url: rimlightImageUrl,
      duration: "5",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.forEach((log) => console.log(`[Fal.ai] ${log.message}`));
      }
    },
  }) as { data: FalResult };

  if (!result.data?.video?.url) {
    throw new Error("Fal.ai 영상 생성 실패: URL 없음");
  }

  return result.data.video.url;
}
