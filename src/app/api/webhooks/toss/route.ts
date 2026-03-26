import { NextResponse } from "next/server";

// TossPayments 웹훅 - 현재 미사용
export async function POST() {
  return NextResponse.json({ received: true });
}
