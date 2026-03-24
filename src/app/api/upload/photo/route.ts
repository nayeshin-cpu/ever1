import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/r2";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

type QualityLevel = "great" | "ok" | "low" | "too_low";

interface QualityFeedback {
  level: QualityLevel;
  message: string;
  shortSide: number;
}

function getQualityFeedback(width: number, height: number): QualityFeedback {
  const shortSide = Math.min(width, height);

  if (shortSide >= 2048) {
    return { level: "great", message: "선명한 사진이에요 👍", shortSide };
  }
  if (shortSide >= 1024) {
    return {
      level: "ok",
      message: "괜찮아요. 더 선명하면 더 좋아요",
      shortSide,
    };
  }
  if (shortSide >= 512) {
    return {
      level: "low",
      message: "해상도가 낮아요. 더 큰 사진을 추천해요",
      shortSide,
    };
  }
  return {
    level: "too_low",
    message: "해상도가 너무 낮아요. 다른 사진을 올려주세요",
    shortSide,
  };
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 임시: 로그인 없이 UI 테스트 가능하도록 우회
    if (!user) {
      return NextResponse.json({
        mediaId: "mock-media-1",
        previewUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400", // 샘플 강아지 이미지
        qualityFeedback: { level: "great", message: "선명한 사진이에요 👍", shortSide: 1024 },
      });
    }

    // multipart/form-data 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const petId = formData.get("petId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    if (!petId) {
      return NextResponse.json(
        { error: "petId가 필요합니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검사
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "10MB 이하 사진을 올려주세요" },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // magic bytes로 실제 MIME 타입 확인
    const { fileTypeFromBuffer } = await import("file-type");
    const fileTypeResult = await fileTypeFromBuffer(buffer);

    if (!fileTypeResult || !ALLOWED_MIME_TYPES.includes(fileTypeResult.mime)) {
      return NextResponse.json(
        { error: "JPG 또는 PNG 파일만 올릴 수 있어요" },
        { status: 400 }
      );
    }

    // sharp로 이미지 메타데이터 추출
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // 품질 피드백 계산
    const qualityFeedback = getQualityFeedback(width, height);

    // R2 업로드
    const timestamp = Date.now();
    const mediaId = uuidv4();
    const ext = fileTypeResult.ext === "png" ? "png" : "jpg";
    const r2Key = `pets/${petId}/originals/${timestamp}_${mediaId}.${ext}`;

    await uploadToR2(r2Key, buffer, fileTypeResult.mime);

    // media_assets 테이블에 행 추가
    const { error: dbError } = await supabase.from("media_assets").insert({
      id: mediaId,
      owner_id: user.id,
      pet_id: petId,
      r2_key_original: r2Key,
      media_type: fileTypeResult.mime === "image/png" ? "png" : "jpg",
      original_width: width,
      original_height: height,
      quality_level: qualityFeedback.level,
      processing_status: "raw",
    });

    if (dbError) {
      return NextResponse.json(
        { error: "데이터베이스 저장 실패: " + dbError.message },
        { status: 500 }
      );
    }

    // 서명된 미리보기 URL 발급
    const previewUrl = await getSignedDownloadUrl(r2Key);

    return NextResponse.json({
      mediaId,
      previewUrl,
      qualityFeedback,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "업로드 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
