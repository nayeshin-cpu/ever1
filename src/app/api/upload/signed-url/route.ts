import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "key가 필요합니다" },
        { status: 400 }
      );
    }

    const url = await getSignedDownloadUrl(key);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Signed URL 생성 실패:", error);
    return NextResponse.json(
      { error: "URL 생성 실패" },
      { status: 500 }
    );
  }
}
