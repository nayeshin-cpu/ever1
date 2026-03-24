import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("pet_profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (data.owner_id !== user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 소유자 확인
  const { data: existing } = await supabase
    .from("pet_profiles")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("pet_profiles")
    .update({
      pet_name: body.pet_name,
      species: body.species,
      breed: body.breed,
      body_type: body.body_type,
      coat_color_hex: body.coat_color_hex,
      age_group: body.age_group,
      energy_level: body.energy_level,
      personality_tags: body.personality_tags,
      is_deceased: body.is_deceased,
      deceased_at: body.deceased_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 소유자 확인
  const { data: existing } = await supabase
    .from("pet_profiles")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await supabase
    .from("pet_profiles")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
