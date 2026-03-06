"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import FaceCamera, { DetectionResult } from "@/app/components/FaceCamera";
import { insertFace } from "@/lib/supabase";

type Stage = "input" | "capture" | "saving" | "success" | "error";

const STEPS = ["이름 입력", "얼굴 촬영", "저장"];

export default function RegisterPage() {
  const router = useRouter();

  const [stage,        setStage]        = useState<Stage>("input");
  const [name,         setName]         = useState("");
  const [hasFace,      setHasFace]      = useState(false);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [savedName,    setSavedName]    = useState("");

  const descriptorRef = useRef<number[] | null>(null);

  // ── 단계별 인덱스 ────────────────────────────────────────
  const stepIndex = stage === "input" ? 0 : stage === "saving" ? 2 : 1;

  // ── FaceCamera 콜백 ─────────────────────────────────────
  const handleResult = useCallback((result: DetectionResult) => {
    setHasFace(result.faceCount > 0);
    setLandmarkCount(result.landmarks?.length ?? 0);
    if (result.descriptor) descriptorRef.current = result.descriptor;
  }, []);

  // ── 이름 입력 → 카메라 단계로 ────────────────────────────
  const goToCapture = () => {
    if (!name.trim()) return;
    setStage("capture");
  };

  // ── 등록 실행 ───────────────────────────────────────────
  const handleRegister = async () => {
    if (!hasFace || !descriptorRef.current) return;

    setStage("saving");

    const { error } = await insertFace(name.trim(), descriptorRef.current);

    if (error) {
      setErrorMsg(error);
      setStage("error");
    } else {
      setSavedName(name.trim());
      setStage("success");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-5 pt-10 pb-8"
      style={{
        background: "linear-gradient(160deg, #0a0e1a 0%, #0d1526 55%, #0a1020 100%)",
      }}
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
          <h1 className="text-lg font-semibold text-white leading-tight">얼굴 등록</h1>
          <p className="text-xs text-slate-500">Face Registration</p>
        </div>

        {/* 단계 인디케이터 */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                  style={{
                    background:
                      i < stepIndex
                        ? "rgba(16,185,129,0.25)"
                        : i === stepIndex
                        ? "#1e4fad"
                        : "rgba(255,255,255,0.05)",
                    color:
                      i < stepIndex ? "#34d399" : i === stepIndex ? "white" : "rgba(255,255,255,0.2)",
                    border: `1px solid ${
                      i < stepIndex
                        ? "rgba(52,211,153,0.3)"
                        : i === stepIndex
                        ? "rgba(99,163,255,0.5)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                  }}
                >
                  {i < stepIndex ? "✓" : i + 1}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          STAGE: input
      ════════════════════════════════════════ */}
      {stage === "input" && (
        <div className="flex flex-col gap-5 flex-1 justify-center max-w-sm mx-auto w-full">
          <div className="text-center mb-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(30,79,173,0.15)", border: "1.5px solid rgba(99,163,255,0.2)" }}
            >
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="10" r="5.5" stroke="#60a5fa" strokeWidth="1.6" fill="none" />
                <path d="M4 27c0-6.1 4.9-11 11-11s11 4.9 11 11" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">이름을 입력하세요</p>
            <p className="text-slate-400 text-sm mt-1">등록할 사용자의 이름을 입력해주세요</p>
          </div>

          {/* 이름 입력 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 ml-1">사용자 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToCapture()}
              placeholder="예: 홍길동"
              maxLength={20}
              className="w-full h-14 rounded-2xl px-4 text-white text-base outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1.5px solid ${name.trim() ? "rgba(99,163,255,0.45)" : "rgba(255,255,255,0.09)"}`,
                caretColor: "#60a5fa",
              }}
              autoFocus
            />
          </div>

          <button
            onClick={goToCapture}
            disabled={!name.trim()}
            className="w-full h-14 rounded-2xl font-semibold text-base transition-all duration-200"
            style={{
              background: name.trim()
                ? "linear-gradient(135deg,#1e4fad 0%,#1a44a0 100%)"
                : "rgba(255,255,255,0.05)",
              color:  name.trim() ? "white" : "rgba(255,255,255,0.2)",
              border: `1px solid ${name.trim() ? "rgba(99,163,255,0.3)" : "rgba(255,255,255,0.07)"}`,
              boxShadow: name.trim() ? "0 4px 20px rgba(30,79,173,0.35)" : "none",
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
          >
            다음 · 얼굴 촬영하기
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: capture
      ════════════════════════════════════════ */}
      {stage === "capture" && (
        <div className="flex flex-col gap-4 flex-1">
          {/* 이름 표시 칩 */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ background: "rgba(30,79,173,0.18)", border: "1px solid rgba(99,163,255,0.25)", color: "#93c5fd" }}
            >
              <span className="text-xs text-slate-400">등록자:</span>
              <span className="font-medium text-white">{name}</span>
            </div>
            <button
              onClick={() => setStage("input")}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              수정
            </button>
          </div>

          {/* 카메라 (descriptor 포함) */}
          <FaceCamera withDescriptor onResult={handleResult} />

          {/* descriptor 정보 */}
          {hasFace && descriptorRef.current && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-xs text-slate-400">특징 벡터 추출</span>
              </div>
              <span className="text-xs font-mono text-blue-400">
                {landmarkCount}pts · 128-dim
              </span>
            </div>
          )}

          {/* 가이드 */}
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              정면을 바라보고 얼굴 전체가 화면에 들어오도록 위치시키세요
            </p>
          </div>

          {/* 등록 버튼 */}
          <button
            onClick={handleRegister}
            disabled={!hasFace || !descriptorRef.current}
            className="w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background:   hasFace ? "linear-gradient(135deg,#1e4fad 0%,#1a44a0 100%)" : "rgba(255,255,255,0.05)",
              color:        hasFace ? "white" : "rgba(255,255,255,0.2)",
              border:       `1px solid ${hasFace ? "rgba(99,163,255,0.3)" : "rgba(255,255,255,0.07)"}`,
              boxShadow:    hasFace ? "0 4px 20px rgba(30,79,173,0.35)" : "none",
              cursor:       hasFace ? "pointer" : "not-allowed",
            }}
          >
            {hasFace ? (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9 L8 13 L14 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                얼굴 등록하기
              </>
            ) : (
              "얼굴을 화면에 위치시키세요"
            )}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: saving
      ════════════════════════════════════════ */}
      {stage === "saving" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div
            className="w-20 h-20 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(59,130,246,0.8) transparent transparent transparent" }}
          />
          <p className="text-white font-medium">Supabase에 저장 중...</p>
          <p className="text-xs text-slate-400">128차원 얼굴 특징 벡터를 암호화 저장합니다</p>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: success
      ════════════════════════════════════════ */}
      {stage === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(16,185,129,0.12)",
              border:     "2px solid rgba(52,211,153,0.45)",
              boxShadow:  "0 0 40px rgba(16,185,129,0.15)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M11 22 L19 30 L33 16" stroke="#34d399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-xl mb-1">{savedName}님 등록 완료!</p>
            <p className="text-slate-400 text-sm">얼굴 생체정보가 안전하게 저장되었습니다</p>
          </div>

          {/* 저장 정보 카드 */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(52,211,153,0.18)" }}
          >
            {[
              { label: "저장 위치", value: "Supabase (암호화)" },
              { label: "특징 벡터", value: "128차원 float 배열" },
              { label: "보안 등급", value: "AES-256 암호화" },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className="flex justify-between items-center px-4 py-3"
                style={{
                  background: i % 2 === 0 ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)",
                  borderBottom: i < 2 ? "1px solid rgba(52,211,153,0.1)" : "none",
                }}
              >
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs text-emerald-400 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => { setStage("input"); setName(""); setHasFace(false); }}
              className="w-full h-14 rounded-2xl font-semibold text-base"
              style={{
                background: "linear-gradient(135deg,#1e4fad 0%,#1a44a0 100%)",
                color: "white",
                border: "1px solid rgba(99,163,255,0.25)",
                boxShadow: "0 4px 20px rgba(30,79,173,0.35)",
              }}
            >
              추가 등록하기
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full h-11 rounded-2xl text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          STAGE: error
      ════════════════════════════════════════ */}
      {stage === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.35)" }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="#f87171" strokeWidth="1.8" />
              <path d="M18 10v10" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="18" cy="25" r="1.5" fill="#f87171" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg mb-2">저장 실패</p>
            <p className="text-red-400 text-xs leading-relaxed">{errorMsg}</p>
          </div>
          <button
            onClick={() => setStage("capture")}
            className="px-8 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
