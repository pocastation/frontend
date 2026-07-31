import { ImageResponse } from "next/og";

// 홍보 링크로 뿌리는 소개 페이지 전용 미리보기 카드.
//
// 루트 app/opengraph-image.tsx가 있는데도 따로 두는 이유: 페이지에서 `openGraph`를 명시하면
// Next.js가 파일 기반 OG 이미지 자동 주입을 덮어써 og:image가 아예 빠진다(실측 확인).
// 홍보용 페이지에서 이미지 없는 summary_large_image 카드는 미리보기가 비어 보이므로 치명적이다.
//
// 톤도 루트와 다르게 간다 — 루트는 흰 배경 서비스 카드, 여기는 브랜드 서사(포카+스테이션 = 우주
// 정거장)를 드러내는 딥스페이스 배경이다. 공유된 링크가 "출시 소개"임이 한눈에 보여야 한다.
//
// ⚠️ next/og(Satori)는 내장 폰트가 라틴만 커버한다. 폰트 파일 번들 없이 안정 렌더하려면
//    라틴 텍스트만 쓸 것 — 한글은 동적 폰트 다운로드 실패 시 통째로 깨진다(루트 카드와 같은 제약).
export const runtime = "edge";
export const alt = "Pocastation — K-POP photocard auction, launching soon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 별빛 좌표. 텍스트 컬럼(좌측)을 피해 상단 띠·우측에만 둔다.
const STARS: { top: number; left: number; size: number; lav?: boolean }[] = [
  { top: 60, left: 120, size: 6 },
  { top: 110, left: 380, size: 5, lav: true },
  { top: 48, left: 700, size: 7 },
  { top: 140, left: 920, size: 5, lav: true },
  { top: 300, left: 1080, size: 8 },
  { top: 470, left: 980, size: 5, lav: true },
  { top: 560, left: 760, size: 6 },
  { top: 540, left: 1120, size: 7, lav: true },
];

export default function IntroOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#160c2e",
          padding: "96px",
          position: "relative",
        }}
      >
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: s.lav ? "#c8bcff" : "#ffffff",
            }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#5326d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "38px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#ebc06b", letterSpacing: "2px" }}>
            POCASTATION
          </div>
        </div>

        <div
          style={{
            marginTop: "40px",
            display: "flex",
            flexDirection: "column",
            fontSize: "68px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            lineHeight: 1.2,
          }}
        >
          <div>Trade K-POP photocards</div>
          <div style={{ color: "#c8bcff" }}>with confidence.</div>
        </div>

        <div style={{ marginTop: "28px", fontSize: "30px", color: "#c8bcff" }}>
          Photo-verified listings · Protected payments · Fair auctions
        </div>
      </div>
    ),
    size,
  );
}
