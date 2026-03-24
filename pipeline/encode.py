"""
EverPet FFmpeg 인코딩 파이프라인 (STEP 6)
- 웹용 1920x1080 MP4
- 홀로그램용 1080x1080 MP4
- 썸네일 400x400 JPG
"""

import os
import tempfile
import logging
from datetime import datetime, timezone

import boto3
import requests
import ffmpeg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- R2 Client ---

s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY"],
    aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_KEY"],
    region_name="auto",
)

BUCKET = os.environ["CLOUDFLARE_R2_BUCKET_NAME"]

# --- Supabase Client ---

from supabase import create_client

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


def upload_to_r2(key: str, file_path: str, content_type: str):
    """로컬 파일을 R2에 업로드"""
    with open(file_path, "rb") as f:
        s3_client.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=f.read(),
            ContentType=content_type,
        )


def encode_video(generation_request_id: str, input_video_url: str):
    """
    영상 인코딩 메인 함수
    - 웹용 1920x1080 MP4
    - 홀로그램용 1080x1080 MP4
    - 썸네일 400x400 JPG
    """
    logger.info(f"인코딩 시작: generation_request_id={generation_request_id}")

    # generation_request에서 pet_id, media_id 조회
    gen_req = (
        supabase.table("generation_requests")
        .select("pet_id, input_media_id, output_media_id")
        .eq("id", generation_request_id)
        .single()
        .execute()
    )
    pet_id = gen_req.data["pet_id"]
    media_id = gen_req.data.get("output_media_id") or gen_req.data["input_media_id"]

    callback_url = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    internal_secret = os.environ.get("INTERNAL_SECRET", "")

    web_key = f"pets/{pet_id}/videos/{media_id}_web.mp4"
    holo_key = f"pets/{pet_id}/videos/{media_id}_holo.mp4"
    thumb_key = f"pets/{pet_id}/thumbnails/{media_id}_thumb.jpg"

    with tempfile.TemporaryDirectory() as tmpdir:
        # 입력 영상 다운로드
        input_path = os.path.join(tmpdir, "input.mp4")
        logger.info(f"영상 다운로드: {input_video_url}")
        resp = requests.get(input_video_url, timeout=120)
        resp.raise_for_status()
        with open(input_path, "wb") as f:
            f.write(resp.content)

        # 인코딩 시작 전에 상태 업데이트
        try:
            requests.post(
                f"{callback_url}/api/internal/generation-done",
                json={
                    "requestId": generation_request_id,
                    "status": "encoding",
                    "progress": 60,
                },
                headers={"x-internal-secret": internal_secret},
                timeout=10,
            )
            logger.info("인코딩 상태 업데이트 완료")
        except Exception as e:
            logger.warning(f"인코딩 상태 업데이트 실패: {e}")

        # 출력 경로
        web_path = os.path.join(tmpdir, "web.mp4")
        holo_path = os.path.join(tmpdir, "holo.mp4")
        thumb_path = os.path.join(tmpdir, "thumb.jpg")

        try:
            # 웹용 1920x1080 MP4 (H.264, CRF 20, 오디오 제거, 검정 패딩)
            logger.info("웹용 1920x1080 인코딩")
            (
                ffmpeg
                .input(input_path)
                .filter("scale", w="1920", h="1080", force_original_aspect_ratio="decrease")
                .filter("pad", w="1920", h="1080", x="(ow-iw)/2", y="(oh-ih)/2", color="black")
                .output(web_path, vcodec="libx264", crf=20, an=None, movflags="faststart")
                .overwrite_output()
                .run(quiet=True)
            )

            # 홀로그램용 1080x1080 MP4 (검정 패딩)
            logger.info("홀로그램용 1080x1080 인코딩")
            (
                ffmpeg
                .input(input_path)
                .filter("scale", w="1080", h="1080", force_original_aspect_ratio="decrease")
                .filter("pad", w="1080", h="1080", x="(ow-iw)/2", y="(oh-ih)/2", color="black")
                .output(holo_path, vcodec="libx264", crf=20, an=None, movflags="faststart")
                .overwrite_output()
                .run(quiet=True)
            )

            # 썸네일 400x400 JPG (1초 지점 프레임 추출)
            logger.info("썸네일 400x400 추출")
            (
                ffmpeg
                .input(input_path, ss=1)
                .filter("scale", w="400", h="400", force_original_aspect_ratio="decrease")
                .filter("pad", w="400", h="400", x="(ow-iw)/2", y="(oh-ih)/2", color="black")
                .output(thumb_path, vframes=1)
                .overwrite_output()
                .run(quiet=True)
            )

            # R2에 업로드
            logger.info("R2 업로드")
            upload_to_r2(web_key, web_path, "video/mp4")
            upload_to_r2(holo_key, holo_path, "video/mp4")
            upload_to_r2(thumb_key, thumb_path, "image/jpeg")

        except Exception as encode_error:
            logger.error(f"인코딩 실패: {encode_error}")
            # 실패 콜백 → generation-done이 크레딧 환불 처리
            try:
                requests.post(
                    f"{callback_url}/api/internal/generation-done",
                    json={
                        "requestId": generation_request_id,
                        "status": "failed",
                        "errorMessage": f"인코딩 중 오류가 발생했습니다: {str(encode_error)}",
                    },
                    headers={"x-internal-secret": internal_secret},
                    timeout=10,
                )
            except Exception as cb_err:
                logger.error(f"실패 콜백 전송 오류: {cb_err}")
            raise

    # media_assets 테이블 업데이트
    supabase.table("media_assets").update({
        "r2_key_video_web": web_key,
        "r2_key_video_holo": holo_key,
        "r2_key_thumbnail": thumb_key,
    }).eq("id", media_id).execute()

    # generation_requests 테이블 업데이트
    supabase.table("generation_requests").update({
        "status": "done",
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", generation_request_id).execute()

    logger.info("인코딩 완료")

    # Next.js 완료 콜백
    try:
        requests.post(
            f"{callback_url}/api/internal/generation-done",
            json={
                "requestId": generation_request_id,
                "status": "done",
                "progress": 100,
                "outputMediaId": media_id,
            },
            headers={"x-internal-secret": internal_secret},
            timeout=10,
        )
        logger.info("콜백 전송 완료")
    except Exception as e:
        logger.error(f"콜백 전송 실패: {e}")

    return {
        "web_key": web_key,
        "holo_key": holo_key,
        "thumb_key": thumb_key,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python encode.py <generation_request_id> <input_video_url>")
        sys.exit(1)

    result = encode_video(sys.argv[1], sys.argv[2])
    print(f"Result: {result}")
