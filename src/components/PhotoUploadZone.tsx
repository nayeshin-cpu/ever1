"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface QualityFeedback {
  level: "great" | "ok" | "low" | "too_low";
  message: string;
  shortSide: number;
}

interface UploadResult {
  mediaId: string;
  previewUrl: string;
  qualityFeedback: QualityFeedback;
}

interface PhotoUploadZoneProps {
  petId: string;
  onUploadComplete: (mediaId: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const QUALITY_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  great: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-300",
  },
  ok: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
  low: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  too_low: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-300",
  },
};

export default function PhotoUploadZone({
  petId,
  onUploadComplete,
}: PhotoUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // 클라이언트 사이드 1차 검사
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("JPG 또는 PNG 파일만 올릴 수 있어요");
        setResult(null);
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("10MB 이하 사진을 올려주세요");
        setResult(null);
        return;
      }

      setError(null);
      setResult(null);
      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("petId", petId);

        // XMLHttpRequest로 진행률 추적
        const uploadResult = await new Promise<UploadResult>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                setProgress(Math.round((e.loaded / e.total) * 100));
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                const body = JSON.parse(xhr.responseText);
                reject(new Error(body.error || "업로드 실패"));
              }
            });

            xhr.addEventListener("error", () => {
              reject(new Error("네트워크 오류가 발생했습니다"));
            });

            xhr.open("POST", "/api/upload/photo");
            xhr.send(formData);
          }
        );

        setResult(uploadResult);
        onUploadComplete(uploadResult.mediaId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다"
        );
      } finally {
        setUploading(false);
      }
    },
    [petId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const borderColor = error
    ? "border-red-400"
    : isDragActive
      ? "border-amber-400"
      : "border-gray-300";

  return (
    <div className="w-full">
      {/* 업로드 완료 후 미리보기 */}
      {result && (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
          <img
            src={result.previewUrl}
            alt="업로드된 사진"
            className="h-64 w-full object-contain bg-gray-50"
          />
          <div
            className={`flex items-center gap-2 px-4 py-3 ${QUALITY_STYLES[result.qualityFeedback.level].bg}`}
          >
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${QUALITY_STYLES[result.qualityFeedback.level].text} ${QUALITY_STYLES[result.qualityFeedback.level].border} border`}
            >
              {result.qualityFeedback.message}
            </span>
          </div>
        </div>
      )}

      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${borderColor} ${
          isDragActive ? "bg-amber-50" : "bg-white hover:bg-gray-50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-sm text-gray-600">업로드 중...</p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        ) : (
          <>
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "여기에 놓으세요!"
                : "여기에 사진을 끌어다 놓거나 클릭해서 선택하세요"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG 최대 10MB · 2K 이상 권장
            </p>
          </>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
