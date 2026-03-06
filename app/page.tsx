"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-12"
      style={{
        background: "linear-gradient(160deg, #0a0e1a 0%, #0d1526 50%, #0a1020 100%)",
      }}
    >
      {/* ── 상단 상태바 ── */}
      <div className="w-full max-w-sm flex justify-between items-center text-xs text-slate-500">
        <span className="tracking-widest font-mono">FACE AUTH</span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }}
          />
          보안 연결됨
        </span>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* 아이콘 + 타이틀 */}
        <div className="flex flex-col items-center gap-6">
          {/* 글로우 + 아이콘 */}
          <div className="relative flex items-center justify-center">
            {/* 배경 글로우 */}
            <div
              className="absolute rounded-full"
              style={{
                width: "160px",
                height: "160px",
                background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
              }}
            />
            {/* 아이콘 컨테이너 */}
            <div
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1a2744 0%, #0f1b33 100%)",
                border: "1.5px solid rgba(59,130,246,0.22)",
                boxShadow:
                  "0 0 40px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
                {/* 얼굴 윤곽 */}
                <ellipse cx="27" cy="23" rx="14.5" ry="16.5" stroke="rgba(96,165,250,0.9)" strokeWidth="1.7" fill="none" />
                {/* 눈 */}
                <circle cx="21" cy="21" r="2.3" fill="rgba(96,165,250,0.9)" />
                <circle cx="33" cy="21" r="2.3" fill="rgba(96,165,250,0.9)" />
                {/* 눈 하이라이트 */}
                <circle cx="22" cy="20" r="0.8" fill="white" fillOpacity="0.6" />
                <circle cx="34" cy="20" r="0.8" fill="white" fillOpacity="0.6" />
                {/* 입 */}
                <path d="M21 28.5 Q27 34 33 28.5" stroke="rgba(96,165,250,0.9)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
                {/* 스캔 라인 */}
                <line x1="13" y1="23" x2="41" y2="23" stroke="rgba(96,165,250,0.3)" strokeWidth="1" strokeDasharray="3 2" />
                {/* 모서리 마커 */}
                <path d="M13 13 L13 17 M13 13 L17 13" stroke="rgba(96,165,250,0.65)" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M41 13 L41 17 M41 13 L37 13" stroke="rgba(96,165,250,0.65)" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M13 39 L13 35 M13 39 L17 39" stroke="rgba(96,165,250,0.65)" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M41 39 L41 35 M41 39 L37 39" stroke="rgba(96,165,250,0.65)" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">얼굴 인증</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI 기반 생체 인증으로<br />안전하게 접근하세요
            </p>
          </div>
        </div>

        {/* ── 버튼 영역 ── */}
        <div className="w-full flex flex-col gap-4">

          {/* 얼굴 등록 버튼 */}
          <Link href="/register" className="block w-full">
            <button
              onPointerDown={() => setPressed("register")}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              className="w-full h-16 rounded-2xl font-semibold text-base tracking-wide transition-all duration-150 flex items-center justify-center gap-3"
              style={{
                background:
                  pressed === "register"
                    ? "linear-gradient(135deg, #1a3e8a 0%, #163580 100%)"
                    : "linear-gradient(135deg, #1e4fad 0%, #1a44a0 100%)",
                boxShadow:
                  pressed === "register"
                    ? "0 2px 12px rgba(30,79,173,0.3)"
                    : "0 4px 24px rgba(30,79,173,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
                transform: pressed === "register" ? "scale(0.98)" : "scale(1)",
                border: "1px solid rgba(99,163,255,0.2)",
                color: "white",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="9" cy="8" r="4" stroke="white" strokeWidth="1.6" fill="none" />
                <path d="M2 19c0-3.9 3.1-7 7-7" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                <path d="M16 3 L16 11 M12 7 L20 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              얼굴 등록
            </button>
          </Link>

          {/* 인증 시작 버튼 */}
          <Link href="/auth" className="block w-full">
            <button
              onPointerDown={() => setPressed("auth")}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              className="w-full h-16 rounded-2xl font-semibold text-base tracking-wide transition-all duration-150 flex items-center justify-center gap-3"
              style={{
                background:
                  pressed === "auth"
                    ? "linear-gradient(135deg, #0d3328 0%, #0b2c22 100%)"
                    : "linear-gradient(135deg, #0f4c35 0%, #0c3f2c 100%)",
                boxShadow:
                  pressed === "auth"
                    ? "0 2px 12px rgba(16,100,67,0.3)"
                    : "0 4px 24px rgba(16,100,67,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
                transform: pressed === "auth" ? "scale(0.98)" : "scale(1)",
                border: "1px solid rgba(52,211,153,0.18)",
                color: "white",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <ellipse cx="11" cy="9" rx="5.5" ry="6" stroke="white" strokeWidth="1.6" fill="none" />
                <circle cx="15" cy="7.5" r="1.4" fill="white" />
                <circle cx="7" cy="7.5" r="1.4" fill="white" />
                <path d="M7.5 12 Q11 15 14.5 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M5 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                <line x1="3" y1="9" x2="19" y2="9" stroke="rgba(52,211,153,0.55)" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
              인증 시작
            </button>
          </Link>
        </div>

        {/* ── 안내 카드 ── */}
        <div className="w-full flex flex-col gap-2.5">
          {[
            {
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.1)",
              text: "얼굴 등록은 최초 1회 진행하며, 이후 모든 인증에 사용됩니다.",
            },
            {
              color: "#34d399",
              bg: "rgba(52,211,153,0.08)",
              text: "생체 데이터는 AES-256 암호화되어 기기 내 안전하게 보관됩니다.",
            },
          ].map(({ color, bg, text }) => (
            <div
              key={text}
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: bg }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 하단 ── */}
      <div className="text-center">
        <p className="text-xs text-slate-600">256-bit 암호화 · AES 보안 · 생체 인증</p>
      </div>
    </div>
  );
}
