import { ImageResponse } from "next/og";

// 자체 이미지가 없는 페이지(홈·스타 등)의 기본 링크 미리보기 이미지. 브랜드 톤(뉴트럴 + 퍼플 포인트).
// 스타 공식 이미지는 저작권으로 쓰지 않으므로(§9.1) 브랜드 카드로 대체한다.
// 주의: next/og(Satori)는 내장 폰트가 라틴만 커버하므로, 폰트 파일 번들 없이 안정 렌더하려면
// 라틴 텍스트만 쓴다(한글/특수 글리프는 동적 폰트 다운로드 실패 위험).
export const runtime = "edge";
export const alt = "Pocastation — K-POP photocard auction";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "#ffffff",
          padding: "96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#5b3fe8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "44px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "#5b3fe8", letterSpacing: "-1px" }}>
            POCASTATION
          </div>
        </div>
        <div style={{ marginTop: "44px", fontSize: "76px", fontWeight: 800, color: "#141414", letterSpacing: "-3px" }}>
          K-POP Photocard Auction
        </div>
        <div style={{ marginTop: "22px", fontSize: "34px", color: "#6b6b6b" }}>
          Trade your favorite star&apos;s photocards, safely.
        </div>
      </div>
    ),
    size,
  );
}
