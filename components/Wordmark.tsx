// 브랜드 워드마크(#277). 별 마크와 `POCA` 축약을 걷어내고 글자만 남긴다.
//
// 이름이 합성어(포카 + 스테이션 = 우주 정거장)라 그 구조를 **굵기로만** 드러낸다 — POCA는 800,
// STATION은 500이다. 색을 나누면 두 단어로 읽히고, 자간까지 넓히면 흩어진다(.05em에서 멈춘다).
// 두 굵기 모두 `next/font`가 이미 싣고 있어(app/layout.tsx: 500·700·800) 추가 로딩이 없다.
//
// 지면 규칙은 하나다 — **밝은 곳은 브랜드 보라, 어두운 곳은 흰색 + STATION만 별빛 골드.**
// 어두운 지면에서 보라는 대비가 모자라 읽히지 않는다.
export default function Wordmark({
  tone = "brand",
  className = "",
}: {
  tone?: "brand" | "inverse";
  className?: string;
}) {
  const inverse = tone === "inverse";
  return (
    // aria-label은 붙이지 않는다 — role 없는 span에는 유효하지 않고, 굵기만 갈렸을 뿐
    // 텍스트 노드는 "Pocastation" 한 단어라 그대로 읽힌다(대문자화는 CSS라 낭독에 영향 없다).
    // 링크 이름은 이 컴포넌트를 감싸는 쪽에서 준다(Header의 `aria-label="포카스테이션 홈"`).
    <span
      className={`font-display font-extrabold uppercase tracking-[0.05em] ${
        inverse ? "text-white" : "text-primary"
      } ${className}`}
    >
      Poca
      <span className={`font-medium ${inverse ? "text-star" : ""}`}>station</span>
    </span>
  );
}
