-- ============================================================
-- face_registrations 테이블
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ============================================================

CREATE TABLE IF NOT EXISTS face_registrations (
  id          uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text            NOT NULL,
  descriptor  double precision[]  NOT NULL,   -- face-api.js 128차원 특징 벡터
  created_at  timestamptz     DEFAULT now()
);

-- RLS(행 수준 보안) 활성화
ALTER TABLE face_registrations ENABLE ROW LEVEL SECURITY;

-- 누구나 등록(INSERT) 가능
CREATE POLICY "allow_insert" ON face_registrations
  FOR INSERT WITH CHECK (true);

-- 누구나 조회(SELECT) 가능 (인증 비교용)
CREATE POLICY "allow_select" ON face_registrations
  FOR SELECT USING (true);

-- 누구나 삭제(DELETE) 가능 (데모용 – 운영 시 제한 권장)
CREATE POLICY "allow_delete" ON face_registrations
  FOR DELETE USING (true);
