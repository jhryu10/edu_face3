/**
 * faceComparison.ts
 *
 * face-api.js 의 faceRecognitionNet 이 출력하는 128차원 특징 벡터(descriptor)를
 * 이용해 두 얼굴의 유사도를 계산합니다.
 *
 * 📐 거리 → 유사도 변환 기준
 *   - face-api.js 공식 권장 임계값: 0.6 (이 이하면 동일인)
 *   - similarity(%) = max(0, (1 - distance / THRESHOLD) * 100)
 *   - distance ≈ 0.0 → 100% (완전 동일)
 *   - distance ≈ 0.3 → 50%
 *   - distance ≥ 0.6 → 0%
 */

/** 조정 가능한 임계값 – 낮출수록 인증 조건이 엄격해짐 */
export const MATCH_THRESHOLD = 0.55;

/** 인증 통과 유사도 (%) */
export const AUTH_PASS_SIMILARITY = 70;

export interface MatchResult {
  id: string;
  name: string;
  similarity: number;  // 0 ~ 100
  distance: number;    // 0 ~ 1 (낮을수록 유사)
}

/**
 * 두 128차원 descriptor 사이의 유클리드 거리
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 999;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * 거리를 유사도(%)로 변환
 */
export function distanceToSimilarity(distance: number): number {
  const raw = (1 - distance / MATCH_THRESHOLD) * 100;
  return Math.max(0, Math.round(raw * 10) / 10);
}

/**
 * 현재 얼굴 descriptor를 등록된 모든 얼굴과 비교해 가장 유사한 결과 반환
 */
export function findBestMatch(
  current: number[],
  registrations: { id: string; name: string; descriptor: number[] }[]
): MatchResult | null {
  if (registrations.length === 0 || current.length < 128) return null;

  let best: MatchResult | null = null;

  for (const reg of registrations) {
    const distance   = euclideanDistance(current, reg.descriptor);
    const similarity = distanceToSimilarity(distance);

    if (!best || distance < best.distance) {
      best = { id: reg.id, name: reg.name, similarity, distance };
    }
  }

  return best;
}

/**
 * 유사도 퍼센트에 따른 UI 색상 반환
 */
export function similarityColor(pct: number): {
  bar: string;
  text: string;
  glow: string;
} {
  if (pct >= AUTH_PASS_SIMILARITY)
    return { bar: "linear-gradient(90deg,#0f4c35,#10b981)", text: "#34d399", glow: "rgba(16,185,129,0.5)" };
  if (pct >= 75)
    return { bar: "linear-gradient(90deg,#78350f,#f59e0b)", text: "#fbbf24", glow: "rgba(245,158,11,0.4)" };
  if (pct >= 50)
    return { bar: "linear-gradient(90deg,#7c2d12,#f97316)", text: "#fb923c", glow: "rgba(249,115,22,0.4)" };
  return   { bar: "linear-gradient(90deg,#7f1d1d,#ef4444)", text: "#f87171", glow: "rgba(239,68,68,0.4)" };
}
