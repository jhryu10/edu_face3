import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── 공유 타입 ────────────────────────────────────────────────

export interface FaceRegistration {
  id: string;
  name: string;
  descriptor: number[];   // 128차원 float
  created_at: string;
}

// ── DB 헬퍼 함수 ─────────────────────────────────────────────

/** 얼굴 등록: name + 128차원 descriptor 저장 */
export async function insertFace(
  name: string,
  descriptor: number[]
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("face_registrations")
    .insert({ name: name.trim(), descriptor });

  return { error: error ? error.message : null };
}

/** 전체 등록 목록 조회 (인증용) */
export async function fetchAllFaces(): Promise<{
  data: FaceRegistration[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("face_registrations")
    .select("id, name, descriptor, created_at")
    .order("created_at", { ascending: false });

  return {
    data: (data as FaceRegistration[]) ?? [],
    error: error ? error.message : null,
  };
}

/** 특정 등록 삭제 */
export async function deleteFace(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("face_registrations")
    .delete()
    .eq("id", id);

  return { error: error ? error.message : null };
}
