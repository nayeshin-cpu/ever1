import jwt from "jsonwebtoken";

const KLING_API_BASE = "https://api.klingai.com/v1";

function generateKlingJWT(): string {
  const apiKey = process.env.KLING_API_KEY!;
  const apiSecret = process.env.KLING_API_SECRET!;
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iss: apiKey,
      exp: now + 1800,
      nbf: now - 5,
    },
    apiSecret,
    { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
  );
}

interface KlingGenerateResponse {
  code: number;
  data: {
    task_id: string;
  };
}

interface KlingStatusResponse {
  code: number;
  data: {
    task_id: string;
    task_status: string;
    task_result?: {
      videos?: Array<{
        url: string;
        duration: number;
      }>;
    };
  };
}

/**
 * Kling AI image-to-video 영상 생성 요청
 */
export async function klingGenerate(
  rimlightImageUrl: string,
  prompt: string
): Promise<string> {
  const token = generateKlingJWT();

  const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      image: rimlightImageUrl,
      prompt,
      model_name: "kling-v1",
      cfg_scale: 0.5,
      mode: "std",
      duration: "5",
    }),
  });

  if (!response.ok) {
    throw new Error(`Kling API 요청 실패: ${response.status}`);
  }

  const result = (await response.json()) as KlingGenerateResponse;

  if (result.code !== 0) {
    throw new Error(`Kling API 에러: code=${result.code}`);
  }

  return result.data.task_id;
}

/**
 * Kling AI 태스크 상태 확인
 * 완료 시 영상 다운로드 URL 반환, 미완료 시 null 반환
 */
export async function klingCheckStatus(
  taskId: string
): Promise<string | null> {
  const token = generateKlingJWT();

  const response = await fetch(
    `${KLING_API_BASE}/videos/image2video/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Kling 상태 확인 실패: ${response.status}`);
  }

  const result = (await response.json()) as KlingStatusResponse;

  if (result.data.task_status === "failed") {
    throw new Error("Kling 영상 생성 실패");
  }

  if (
    result.data.task_status === "succeed" &&
    result.data.task_result?.videos?.[0]
  ) {
    return result.data.task_result.videos[0].url;
  }

  return null; // 아직 처리 중
}

/**
 * Kling AI 영상 생성 및 완료 대기 (폴링)
 */
export async function klingGenerateAndWait(
  rimlightImageUrl: string,
  prompt: string,
  maxWaitMs: number = 300000, // 5분
  pollIntervalMs: number = 5000 // 5초
): Promise<string> {
  const taskId = await klingGenerate(rimlightImageUrl, prompt);

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const videoUrl = await klingCheckStatus(taskId);
    if (videoUrl) {
      return videoUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Kling 영상 생성 시간 초과");
}
