import { ImageResponse } from "next/og";
import { BRAND_HEADLINE_LINES, BRAND_SUBHEAD } from "@/lib/site";

// 자체 이미지가 없는 페이지(홈·스타 등)의 기본 링크 미리보기 이미지. 스타 공식 이미지는 저작권으로
// 쓰지 않으므로(§9.1) 브랜드 카드로 대체한다.
//
// 링크 미리보기는 「우주(브랜드 면)」에 속한다 — 딥스페이스 바탕 + 별빛, 워드마크, 히어로와 같은
// 한국어 카피(#765). 예전 카드는 옛 브랜드색(#5b3fe8)·걷어낸 P 마크·영어 「Photocard Auction」
// 문구가 남아 있었다.
//
// 🔴 Satori(next/og)의 내장 폰트는 라틴만 그린다. 한글은 `app/og-fonts/`의 서브셋 글꼴로 그린다 —
// Pretendard(OFL)에서 이 카드에 쓰는 글자만 잘라 이름을 PocastationOG로 바꾼 파일이다(약 15KB).
// **카피(`lib/site.ts`)를 바꾸면 새 글자가 빠져 두부(□)로 나온다.** 그때는 `app/og-fonts/README.md`
// 절차로 서브셋을 다시 만든다.
export const runtime = "edge";
export const alt = "포카스테이션 — K-POP 포카 거래";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DEEPSPACE = "#160c2e";
const STAR = "#ebc06b";
const NEBULA = "#c8bcff";

// 별빛 좌표. 왼쪽 글자 칸을 피해 오른쪽에만 둔다.
const STARS: { top: number; left: number; size: number; color: string }[] = [
  { top: 96, left: 1010, size: 12, color: STAR },
  { top: 180, left: 840, size: 6, color: "#ffffff" },
  { top: 300, left: 1100, size: 7, color: NEBULA },
  { top: 420, left: 900, size: 6, color: "#ffffff" },
  { top: 520, left: 1060, size: 8, color: NEBULA },
  { top: 70, left: 760, size: 5, color: "#ffffff" },
];

export default async function OpengraphImage() {
  const [extrabold, medium] = await Promise.all([
    fetch(new URL("./og-fonts/og-extrabold.otf", import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL("./og-fonts/og-medium.otf", import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  // 마지막 줄 「포카스테이션」은 워드마크가 대신 말하므로 카드에서는 앞 두 줄만 쓴다.
  const headline = BRAND_HEADLINE_LINES.slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: DEEPSPACE,
          padding: "0 96px",
          fontFamily: "PocastationOG",
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
              borderRadius: s.size,
              background: s.color,
            }}
          />
        ))}
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: "0.05em", color: "#ffffff" }}>
          POCA<span style={{ fontWeight: 500, color: STAR }}>STATION</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
          {headline.map((line) => (
            <div key={line} style={{ fontSize: 76, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1.22 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, fontWeight: 500, color: NEBULA }}>
          {BRAND_SUBHEAD.replace("\n", " ")}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "PocastationOG", data: extrabold, weight: 800, style: "normal" },
        { name: "PocastationOG", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
