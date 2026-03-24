import { NextResponse } from "next/server";

export async function GET() {
  /* 임시: 로그인 없이 UI 테스트 가능하도록 모의 데이터 반환
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { data, error } = await supabase.from("pet_profiles").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  */

  // 가짜 반려동물 데이터 (UI 확인용)
  const mockPets = [
    {
      id: "mock-pet-1",
      pet_name: "콩이",
      species: "dog",
      breed: "말티즈",
      body_type: "소형",
    }
  ];

  return NextResponse.json(mockPets);
}

export async function POST(request: Request) {
  /* 임시: 로그인 없이 UI 테스트 가능하도록 생성 성공으로 처리
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const body = await request.json();
  const { data, error } = await supabase.from("pet_profiles").insert({...}).select().single();
  */

  // 요청이 성공한 것처럼 처리하여 대시보드로 리다이렉트 유도
  return NextResponse.json({ id: "mock-pet-new", pet_name: "새로운 아이" }, { status: 201 });
}
