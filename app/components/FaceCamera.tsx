"use client";

import { useEffect, useRef, useState } from "react";

export interface FaceLandmark {
  x: number;
  y: number;
}

export interface DetectionResult {
  faceCount:   number;
  landmarks:   FaceLandmark[] | null;   // 68개 특징점
  descriptor:  number[]       | null;   // 128차원 얼굴 벡터 (withDescriptor=true 시)
}

interface Props {
  /** true 이면 faceRecognitionNet 도 로드해 128차원 descriptor 추출 */
  withDescriptor?: boolean;
  onResult?: (result: DetectionResult) => void;
}

// ─── 랜드마크 연결선 정의 (68pts) ───────────────────────────
const CONNECTIONS: { indices: number[]; close?: boolean }[] = [
  { indices: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
  { indices: [17,18,19,20,21] },
  { indices: [22,23,24,25,26] },
  { indices: [27,28,29,30] },
  { indices: [30,31,32,33,34,35,30] },
  { indices: [36,37,38,39,40,41], close: true },
  { indices: [42,43,44,45,46,47], close: true },
  { indices: [48,49,50,51,52,53,54,55,56,57,58,59], close: true },
  { indices: [60,61,62,63,64,65,66,67], close: true },
];

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  landmarks: { x: number; y: number }[],
  score: number
) {
  const { x, y, width: w, height: h } = box;
  const bl = Math.min(w, h) * 0.18;

  // 반투명 박스
  ctx.strokeStyle = "rgba(59,130,246,0.3)";
  ctx.lineWidth   = 1;
  ctx.strokeRect(x, y, w, h);

  // 코너 브라켓 (glow)
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur  = 14;
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";

  const corners: [number, number][][] = [
    [[x, y + bl],     [x, y],     [x + bl, y]],
    [[x+w-bl, y],     [x+w, y],   [x+w, y + bl]],
    [[x, y+h-bl],     [x, y+h],   [x + bl, y+h]],
    [[x+w-bl, y+h],   [x+w, y+h], [x+w, y+h-bl]],
  ];
  corners.forEach((pts) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // 랜드마크 연결선
  CONNECTIONS.forEach(({ indices, close }) => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(96,165,250,0.5)";
    ctx.lineWidth   = 1;
    indices.forEach((i, k) => {
      const p = landmarks[i];
      k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  });

  // 랜드마크 점
  ctx.fillStyle = "rgba(96,165,250,0.88)";
  landmarks.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // 신뢰도
  ctx.font      = "bold 11px monospace";
  ctx.fillStyle = "#60a5fa";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur  = 6;
  ctx.fillText(`${Math.round(score * 100)}%`, x + 4, y - 6);
  ctx.shadowBlur = 0;
}

type Status = "loading" | "error" | "no-face" | "face";

export default function FaceCamera({ withDescriptor = false, onResult }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const onResultRef = useRef(onResult);
  const scanYRef   = useRef(0);
  const scanDirRef = useRef(1);

  const [status,   setStatus]   = useState<Status>("loading");
  const [loadMsg,  setLoadMsg]  = useState("AI 모델 초기화 중...");
  const [faceCount, setFaceCount] = useState(0);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadMsg("AI 모델 로딩 중...");
        const faceapi = await import("face-api.js");

        const models = [
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ];
        if (withDescriptor) {
          models.push(faceapi.nets.faceRecognitionNet.loadFromUri("/models"));
        }
        await Promise.all(models);

        if (!active) return;
        setLoadMsg("카메라 연결 중...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStatus("no-face");

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        });

        const loop = async () => {
          if (!active || !videoRef.current || !canvasRef.current) return;

          const video  = videoRef.current;
          const canvas = canvasRef.current;
          const ctx    = canvas.getContext("2d")!;

          const vw = video.videoWidth  || 640;
          const vh = video.videoHeight || 480;
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }

          ctx.clearRect(0, 0, vw, vh);

          // 스캔 라인 애니메이션
          scanYRef.current += scanDirRef.current * 2.5;
          if (scanYRef.current >= vh) { scanYRef.current = vh; scanDirRef.current = -1; }
          if (scanYRef.current <= 0)  { scanYRef.current = 0;  scanDirRef.current =  1; }

          const grad = ctx.createLinearGradient(0, scanYRef.current - 30, 0, scanYRef.current + 30);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(0.5, "rgba(59,130,246,0.1)");
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(0, scanYRef.current - 30, vw, 60);

          ctx.strokeStyle = "rgba(59,130,246,0.3)";
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.moveTo(0, scanYRef.current);
          ctx.lineTo(vw, scanYRef.current);
          ctx.stroke();

          // 얼굴 감지
          let dets: {
            detection: { box: { x:number;y:number;width:number;height:number }; score:number };
            landmarks: { positions: { x:number;y:number }[] };
            descriptor?: Float32Array;
          }[];

          if (withDescriptor) {
            dets = (await faceapi
              .detectAllFaces(video, detectorOptions)
              .withFaceLandmarks()
              .withFaceDescriptors()) as typeof dets;
          } else {
            const raw = await faceapi
              .detectAllFaces(video, detectorOptions)
              .withFaceLandmarks();
            dets = raw.map((d) => ({
              detection: d.detection,
              landmarks: d.landmarks,
            }));
          }

          if (!active || !canvasRef.current) return;

          const count = dets.length;
          setFaceCount(count);
          setStatus(count > 0 ? "face" : "no-face");

          let firstLandmarks: FaceLandmark[] | null = null;
          let firstDescriptor: number[] | null = null;

          dets.forEach((det, idx) => {
            const box = det.detection.box;
            const pts = det.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
            drawOverlay(ctx, box, pts, det.detection.score);

            if (idx === 0) {
              firstLandmarks   = pts;
              firstDescriptor  = det.descriptor ? Array.from(det.descriptor) : null;
            }
          });

          onResultRef.current?.({
            faceCount: count,
            landmarks: firstLandmarks,
            descriptor: firstDescriptor,
          });

          rafRef.current = requestAnimationFrame(loop);
        };

        loop();
      } catch (err) {
        if (!active) return;
        console.error("FaceCamera:", err);
        setStatus("error");
      }
    })();

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withDescriptor]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "3/4",
        background: "#060a14",
        border: "1.5px solid rgba(59,130,246,0.18)",
        boxShadow: "0 0 40px rgba(59,130,246,0.06)",
      }}
    >
      {/* 로딩 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-[#060a14]">
          <div
            className="w-11 h-11 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(59,130,246,0.8) transparent transparent transparent" }}
          />
          <p className="text-sm text-slate-400">{loadMsg}</p>
          {withDescriptor && (
            <p className="text-xs text-slate-600">인식 모델 (~6MB) 로딩 중...</p>
          )}
        </div>
      )}

      {/* 에러 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-[#060a14] text-center px-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="10" stroke="#f87171" strokeWidth="1.5" />
              <path d="M13 7v7" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
              <circle cx="13" cy="18" r="1.2" fill="#f87171" />
            </svg>
          </div>
          <p className="text-white font-semibold">카메라 접근 실패</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            브라우저 주소창 옆 카메라 아이콘을 클릭해<br />권한을 허용해주세요
          </p>
        </div>
      )}

      {/* 비디오 (셀피 모드 – 좌우 반전) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        muted
        playsInline
      />

      {/* 감지 오버레이 (캔버스도 반전 동기화) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* 상단 코너 데코 */}
      {status !== "loading" && status !== "error" && (
        <div className="absolute top-3 left-3 right-3 flex justify-between pointer-events-none z-10">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 9 L1 1 L9 1" stroke="rgba(59,130,246,0.45)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17 9 L17 1 L9 1" stroke="rgba(59,130,246,0.45)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* 하단 상태 배지 */}
      {(status === "face" || status === "no-face") && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10 pointer-events-none">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background:  status === "face" ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.12)",
              border:      `1px solid ${status === "face" ? "rgba(16,185,129,0.32)" : "rgba(239,68,68,0.25)"}`,
              color:       status === "face" ? "#34d399" : "#f87171",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{
                background: status === "face" ? "#34d399" : "#f87171",
                boxShadow:  status === "face" ? "0 0 5px #34d399" : "0 0 5px #f87171",
              }}
            />
            {status === "face" ? `얼굴 감지됨 · ${faceCount}명` : "얼굴 미감지"}
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.45)", backdropFilter: "blur(8px)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE
          </div>
        </div>
      )}
    </div>
  );
}
