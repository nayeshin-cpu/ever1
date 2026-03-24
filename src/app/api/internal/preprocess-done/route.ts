import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // x-internal-secret 인증
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json(
        { error: "인증 실패" },
        { status: 401 }
      );
    }

    const { requestId, status, progress } = await request.json();

    console.log(
      `Preprocess done: requestId=${requestId}, status=${status}, progress=${progress}`
    );

    const supabase = createServerSupabaseClient();

    // generation_requests 상태 업데이트
    const { error } = await supabase
      .from("generation_requests")
      .update({
        status: "preprocessing",
        progress: progress ?? 30,
      })
      .eq("id", requestId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Preprocess callback error:", error);
    return NextResponse.json(
      { error: "콜백 처리 실패" },
      { status: 500 }
    );
  }
}
