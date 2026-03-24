"""
EverPet 이미지 전처리 파이프라인 (STEP 1~3)
- STEP 1: 배경 제거 (rembg)
- STEP 2: 림라이트 추가 (Pillow + numpy)
- STEP 3: 깊이 추정 (Depth Anything v2)
"""

import io
import os
import logging

import boto3
import numpy as np
import requests
from PIL import Image, ImageFilter
from rembg import remove
from supabase import create_client

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

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


def download_from_r2(key: str) -> bytes:
    """R2에서 파일 다운로드"""
    response = s3_client.get_object(Bucket=BUCKET, Key=key)
    return response["Body"].read()


def upload_to_r2(key: str, data: bytes, content_type: str = "image/png"):
    """R2에 파일 업로드"""
    s3_client.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def step1_remove_background(image_bytes: bytes) -> Image.Image:
    """STEP 1: rembg로 배경 제거 → 투명 PNG"""
    logger.info("STEP 1: 배경 제거 시작")
    output_bytes = remove(image_bytes)
    img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    logger.info("STEP 1: 배경 제거 완료")
    return img


def step2_add_rimlight(img: Image.Image) -> Image.Image:
    """STEP 2: 알파 채널 기반 외곽선 림라이트 효과 추가"""
    logger.info("STEP 2: 림라이트 추가 시작")

    arr = np.array(img)
    alpha = arr[:, :, 3]

    # 외곽선 감지: 알파 채널에서 에지 추출
    alpha_img = Image.fromarray(alpha)
    # 팽창 - 원본 = 외곽선
    dilated = alpha_img.filter(ImageFilter.MaxFilter(size=7))
    edge = np.array(dilated).astype(np.float32) - alpha.astype(np.float32)
    edge = np.clip(edge, 0, 255)

    # Gaussian blur로 부드러운 글로우 생성
    glow_img = Image.fromarray(edge.astype(np.uint8))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=8))
    glow = np.array(glow_img).astype(np.float32) / 255.0

    # 흰빛 글로우를 원본 이미지에 적용
    result = arr.copy().astype(np.float32)
    for c in range(3):  # RGB 채널
        result[:, :, c] = np.clip(
            result[:, :, c] + glow * 200,  # 밝기 부스트
            0,
            255,
        )

    # 글로우 영역의 알파값도 추가
    result[:, :, 3] = np.clip(
        arr[:, :, 3].astype(np.float32) + glow * 180,
        0,
        255,
    )

    result_img = Image.fromarray(result.astype(np.uint8), "RGBA")
    logger.info("STEP 2: 림라이트 추가 완료")
    return result_img


def step3_depth_estimation(img: Image.Image) -> np.ndarray:
    """STEP 3: Depth Anything v2로 깊이 맵 생성"""
    logger.info("STEP 3: 깊이 추정 시작")

    try:
        import torch
        from torchvision.transforms import Compose, Normalize, Resize, ToTensor

        # RGB로 변환 (깊이 추정은 RGB 입력)
        rgb_img = img.convert("RGB")

        # 간단한 전처리
        transform = Compose([
            Resize((518, 518)),
            ToTensor(),
            Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        input_tensor = transform(rgb_img).unsqueeze(0)

        # Depth Anything v2 모델 로드 (Hub에서)
        model = torch.hub.load(
            "LiheYoung/Depth-Anything",
            "DepthAnything_vitb14",
            trust_repo=True,
        )
        model.eval()

        with torch.no_grad():
            depth = model(input_tensor)

        depth_map = depth.squeeze().cpu().numpy()
        # 0~255로 정규화
        depth_map = (
            (depth_map - depth_map.min())
            / (depth_map.max() - depth_map.min() + 1e-8)
            * 255
        ).astype(np.uint8)

        logger.info("STEP 3: 깊이 추정 완료")
        return depth_map

    except Exception as e:
        logger.warning(f"STEP 3: 깊이 추정 모델 로드 실패, 기본 깊이 맵 사용: {e}")
        # 폴백: 알파 채널 기반 간단한 깊이 맵
        alpha = np.array(img.convert("RGBA"))[:, :, 3]
        return alpha


def image_to_bytes(img: Image.Image) -> bytes:
    """PIL Image → PNG bytes"""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def preprocess_image(pet_id: str, media_id: str, r2_original_key: str, request_id: str = None):
    """
    전처리 파이프라인 메인 함수
    STEP 1 → STEP 2 → STEP 3 순서로 실행
    """
    logger.info(f"전처리 시작: pet_id={pet_id}, media_id={media_id}, request_id={request_id}")

    # 원본 이미지 다운로드
    original_bytes = download_from_r2(r2_original_key)

    # STEP 1: 배경 제거
    bg_removed_img = step1_remove_background(original_bytes)
    bg_removed_key = f"pets/{pet_id}/processed/{media_id}_bg_removed.png"
    upload_to_r2(bg_removed_key, image_to_bytes(bg_removed_img))

    supabase.table("media_assets").update(
        {"r2_key_bg_removed": bg_removed_key}
    ).eq("id", media_id).execute()

    logger.info(f"STEP 1 완료: {bg_removed_key}")

    # STEP 2: 림라이트
    rimlight_img = step2_add_rimlight(bg_removed_img)
    rimlight_key = f"pets/{pet_id}/processed/{media_id}_rimlight.png"
    upload_to_r2(rimlight_key, image_to_bytes(rimlight_img))

    supabase.table("media_assets").update(
        {"r2_key_rimlight": rimlight_key}
    ).eq("id", media_id).execute()

    logger.info(f"STEP 2 완료: {rimlight_key}")

    # STEP 3: 깊이 추정
    depth_map = step3_depth_estimation(rimlight_img)
    depth_key = f"pets/{pet_id}/processed/{media_id}_depth.png"
    depth_img = Image.fromarray(depth_map)
    upload_to_r2(depth_key, image_to_bytes(depth_img))

    # processing_status를 'processed'로 업데이트
    supabase.table("media_assets").update(
        {"processing_status": "processed"}
    ).eq("id", media_id).execute()

    logger.info(f"STEP 3 완료: {depth_key}")

    # Next.js 콜백 엔드포인트 호출
    callback_url = os.environ.get(
        "NEXT_PUBLIC_APP_URL", "http://localhost:3000"
    )
    internal_secret = os.environ.get("INTERNAL_SECRET", "")
    if request_id:
        try:
            requests.post(
                f"{callback_url}/api/internal/preprocess-done",
                json={
                    "requestId": request_id,
                    "status": "preprocessing",
                    "progress": 30,
                },
                headers={"x-internal-secret": internal_secret},
                timeout=10,
            )
            logger.info("콜백 전송 완료")
        except Exception as e:
            logger.error(f"콜백 전송 실패: {e}")
    else:
        logger.info("requestId 없음 - 콜백 스킵")

    logger.info(f"전처리 완료: media_id={media_id}")
    return {
        "bg_removed_key": bg_removed_key,
        "rimlight_key": rimlight_key,
        "depth_key": depth_key,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Usage: python preprocess.py <pet_id> <media_id> <r2_original_key> [request_id]")
        sys.exit(1)

    request_id = sys.argv[4] if len(sys.argv) > 4 else None
    result = preprocess_image(sys.argv[1], sys.argv[2], sys.argv[3], request_id)
    print(f"Result: {result}")
