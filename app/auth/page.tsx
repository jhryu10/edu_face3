"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import FaceCamera, { DetectionResult } from "@/app/components/FaceCamera";
import { fetchAllFaces, FaceRegistration } from "@/lib/supabase";
import {
  findBestMatch,
  MatchResult,
  similarityColor,
  AUTH_PASS_SIMILARITY,
} from "@/lib/faceComparison";

type AuthStage = "loading-db" | "scanning" | "matched" | "success" | "db-error" | "no-users";

/** 연속 프레임 기준: 이만큼 연속으로 90% 이상이면 인증 완료 */
const REQUIRED_CONSECUTIVE = 25;

export default function AuthPage() {
  const router = useRouter();

  const [stage,         setStage]         = useState<AuthStage>("loading-db");
  const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);
  const [dbError,       setDbError]       = useState("");
  const [bestMatch,     setBestMatch]      = useState<MatchResult | null>(null);
  const [smoothedSim,   setSmoothedSim]   = useState(0);  // 평활화된 유사도
  const [consecutive,   setConsecutive]   = useState(0);
  const [matchedUser,   setMatchedUser]   = useState("");
  const [finalSim,      setFinalSim]      = useState(0);

  const stageRef        = useRef<AuthStage>("loading-db");
  const consecutiveRef  = useRef(0);
  const simHistoryRef   = useRef<number[]>([]);   // 최근 10프레임 유사도
  const regsRef         = useRef<FaceRegistration[]>([]);

  // ── Supabase에서 등록 목록 로드 ──────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await fetchAllFaces();
      if (error) {
        setDbError(error);
        setStage("db-error");
        stageRef.current = "db-error";
        return;
      }
      if (data.length === 0) {
        setStage("no-users");
        stageRef.current = "no-users";
        return;
      }
      regsRef.current = data;
      setRegistrations(data);
      setStage("scanning");
      stageRef.current = "scanning";
    })();
  }, []);

  // ── FaceCamera 콜백 (실시간 비교) ────────────────────────
  const handleResult = useCallback((result: DetectionResult) => {
    if (stageRef.current !== "scanning") return;

    if (!result.descriptor || result.faceCount === 0) {
      // 얼굴 없음 → 리셋
      simHistoryRef.current = [];
      consecutiveRef.current = 0;
      setConsecutive(0);
      setSmoothedSim(0);
      setBestMatch(null);
      return;
    }

    // 최고 일치 계산
    const match = findBestMatch(result.descriptor, regsRef.current);
    setBestMatch(match);

    const sim = match?.similarity ?? 0;

    // 이동 평균 (10프레임)
    simHistoryRef.current.push(sim);
    if (simHistoryRef.current.length > 10) simHistoryRef.current.shift();
    const avg = simHistoryRef.current.reduce((s, v) => s + v, 0) / simHistoryRef.current.length;
    setSmoothedSim(Math.round(avg * 10) / 10);

    if (avg >= AUTH_PASS_SIMILARITY) {
      consecutiveRef.current++;
      setConsecutive(consecutiveRef.current);

      if (consecutiveRef.current >= REQUIRED_CONSECUTIVE) {
        stageRef.current = "success";
        setMatchedUser(match!.name);
        setFinalSim(Math.round(avg * 10) / 10);
        setStage("success");
      }
    } else {
      consecutiveRef.current = 0;
      setConsecutive(0);
    }
  }, []);

  const reset = () => {
    consecutiveRef.current = 0;
    simHistoryRef.current  = [];
    stageRef.current       = "scanning";
    setStage("scanning");
    setConsecutive(0);
    setSmoothedSim(0);
    setBestMatch(null);
  };

  // ── 유사도 색상 ───────────────────────────────────────────
  const colors = similarityColor(smoothedSim);

  // ── 진행 게이지 (25프레임 기준) ───────────────────────────
  const lockProgress = Math.round((consecutiveRef.current / REQUIRED_CONSECUTIVE) * 100);

  return (
    <div
      className="min-h-screen flex flex-col px-5 pt-10 pb-8"
      style={{ background: "linear-gradient(160deg,#0a0e1a 0%,#0d1526 55%,#0a1020 100%)" }}
    >
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9l5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white leading-tight">얼굴 인증</h1>
          <p className="text-xs text-slate-500">Face Authentication</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399", boxShadow: "0 0 5px #34d399" }} />
          {registrations.length > 0 ? `${registrations.length}명 등록됨` : "보안 연결"}
        </div>
      </div>

      {/* ════════════════════════════════════════
          STAGE: loading-db
      ════════════════════════════════════════ */}
      {stage === "loading-db" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div
            className="w-11 h-11 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(59,130,246,0.8) transparent transparent transparent" }}
          />
          <p className="text-slate-400 text-sm">등록 데이터 불러오는 중...</p>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: db-error
      ════════════════════════════════════════ */}
      {stage === "db-error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.3)" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 5 L25 23 H3 Z" stroke="#f87171" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
              <path d="M14 11v6" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="20" r="1.2" fill="#f87171" />
            </svg>
          </div>
          <p className="text-white font-semibold">데이터 로드 실패</p>
          <p className="text-red-400 text-xs leading-relaxed">{dbError}</p>
          <p className="text-slate-500 text-xs">.env.local 의 Supabase 설정을 확인해주세요</p>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: no-users
      ════════════════════════════════════════ */}
      {stage === "no-users" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.3)" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="9" r="5" stroke="#fbbf24" strokeWidth="1.6" fill="none" />
              <path d="M4 25c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M20 4 L20 10 M17 7 L23 7" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">등록된 얼굴 없음</p>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              먼저 얼굴을 등록해야 인증할 수 있습니다
            </p>
          </div>
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg,#1e4fad 0%,#1a44a0 100%)",
              color: "white",
              border: "1px solid rgba(99,163,255,0.3)",
              boxShadow: "0 4px 20px rgba(30,79,173,0.35)",
            }}
          >
            얼굴 등록하러 가기
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: scanning
      ════════════════════════════════════════ */}
      {stage === "scanning" && (
        <div className="flex flex-col gap-4 flex-1">
          {/* 카메라 */}
          <FaceCamera withDescriptor onResult={handleResult} />

          {/* 유사도 패널 */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
          >
            {/* 일치 대상 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-xs text-slate-500">최고 일치 대상</span>
              <span className="text-sm font-semibold text-white">
                {bestMatch ? bestMatch.name : "—"}
              </span>
            </div>

            {/* 유사도 바 */}
            <div className="px-4 pb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs" style={{ color: colors.text }}>유사도</span>
                <span className="text-sm font-mono font-bold" style={{ color: colors.text }}>
                  {smoothedSim.toFixed(1)}%
                </span>
              </div>
              <div className="relative w-full h-2.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.min(100, smoothedSim)}%`,
                    background: colors.bar,
                    boxShadow: `0 0 8px ${colors.glow}`,
                  }}
                />
                {/* 90% 기준선 */}
                <div
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: "90%", background: "rgba(255,255,255,0.3)" }}
                />
              </div>
              <div className="flex justify-end mt-0.5">
                <span className="text-[10px] text-slate-600">인증 기준: 90%</span>
              </div>
            </div>

            {/* 잠금 게이지 (90% 이상일 때만) */}
            {smoothedSim >= AUTH_PASS_SIMILARITY && (
              <div
                className="mx-4 mb-3 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"
                    />
                    얼굴 잠금 해제 중...
                  </span>
                  <span className="text-xs font-mono text-emerald-400">{lockProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(52,211,153,0.15)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${lockProgress}%`,
                      background: "linear-gradient(90deg,#0f4c35,#10b981)",
                      boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* 등록 목록 미리보기 */}
            <div
              className="flex gap-2 px-4 pb-3 flex-wrap"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-xs text-slate-600 mt-2 w-full">비교 대상</span>
              {registrations.slice(0, 5).map((r) => (
                <span
                  key={r.id}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background:
                      bestMatch?.name === r.name
                        ? "rgba(59,130,246,0.2)"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      bestMatch?.name === r.name
                        ? "rgba(99,163,255,0.35)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    color: bestMatch?.name === r.name ? "#93c5fd" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {r.name}
                </span>
              ))}
              {registrations.length > 5 && (
                <span className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  +{registrations.length - 5}명
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            카메라를 정면으로 바라보고 잠시 기다려주세요
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: success
      ════════════════════════════════════════ */}
      {stage === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* 성공 아이콘 */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: "#10b981", transform: "scale(1.4)" }}
            />
            <div
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(16,185,129,0.14)",
                border: "2.5px solid rgba(52,211,153,0.6)",
                boxShadow: "0 0 50px rgba(16,185,129,0.25)",
              }}
            >
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <path d="M14 26 L23 35 L38 20" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <p
              className="text-2xl font-bold mb-1"
              style={{ color: "#34d399" }}
            >
              인증 성공
            </p>
            <p className="text-white text-lg font-semibold">{matchedUser}님 확인됨</p>
            <p className="text-slate-400 text-sm mt-1">본인 확인이 완료되었습니다</p>
          </div>

          {/* 인증 상세 카드 */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(52,211,153,0.2)" }}
          >
            {[
              { label: "인증 방식",  value: "얼굴 생체 인식 (AI)" },
              { label: "일치 유사도", value: `${finalSim}%` },
              { label: "인증 기준",  value: `${AUTH_PASS_SIMILARITY}% 이상` },
              { label: "보안 등급",  value: "Level 3 (고보안)" },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className="flex justify-between items-center px-4 py-3"
                style={{
                  background: i % 2 === 0 ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.03)",
                  borderBottom: i < 3 ? "1px solid rgba(52,211,153,0.1)" : "none",
                }}
              >
                <span className="text-xs text-slate-500">{label}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: label === "일치 유사도" ? "#34d399" : "#6ee7b7" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-full h-14 rounded-2xl font-semibold text-base"
              style={{
                background: "linear-gradient(135deg,#0f4c35 0%,#0c3f2c 100%)",
                color: "white",
                border: "1px solid rgba(52,211,153,0.25)",
                boxShadow: "0 4px 20px rgba(16,100,67,0.35)",
              }}
            >
              홈으로 돌아가기
            </button>
            <button
              onClick={reset}
              className="w-full h-11 rounded-2xl text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              다시 인증하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
