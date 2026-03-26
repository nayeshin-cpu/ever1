import { NextResponse } from "next/server";

// TossPayments 빌링 - 현재 미사용
export async function POST() {
  return NextResponse.json(
    { error: "결제 기능은 준비 중입니다." },
    { status: 503 }
  );
}
