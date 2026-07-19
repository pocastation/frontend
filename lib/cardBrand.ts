// 카드사명(PG가 내려준 publisher 텍스트) → 카드 시각화 배경색. 토스/카카오페이처럼 실제 카드
// 디자인 이미지를 쓰지 않고(카드사별 이미지 라이선싱은 소규모 팀엔 과함, §부록 "만들지 말고 사라"),
// 카드사 고유 브랜드컬러 그라디언트 + 카드사명 텍스트만으로 "한눈에 구분되는" 카드 UI를 만든다.
// 절제된 톤 원칙(파스텔 필 금지)에 맞춰 채도를 낮춘 딥톤 컬러만 쓴다.
type CardBrandStyle = {
  from: string;
  to: string;
  text: string;
};

const FALLBACK_STYLE: CardBrandStyle = { from: "#374151", to: "#4b5563", text: "#ffffff" };

// 카드사명에 포함된 키워드로 매칭한다(PG가 "신한카드"처럼 정식 명칭을 그대로 내려줌).
// 순서 무관 — 카드사명은 서로 겹치는 키워드가 없다.
const CARD_BRAND_STYLES: { keyword: string; style: CardBrandStyle }[] = [
  { keyword: "신한", style: { from: "#00347d", to: "#0059b3", text: "#ffffff" } },
  { keyword: "국민", style: { from: "#7a4b1e", to: "#a9722f", text: "#ffffff" } },
  { keyword: "삼성", style: { from: "#0f172a", to: "#1e293b", text: "#ffffff" } },
  { keyword: "현대", style: { from: "#0b0b0c", to: "#262626", text: "#ffffff" } },
  { keyword: "롯데", style: { from: "#7a1a26", to: "#a52535", text: "#ffffff" } },
  { keyword: "우리", style: { from: "#0b3d6e", to: "#12659e", text: "#ffffff" } },
  { keyword: "하나", style: { from: "#00543f", to: "#128a68", text: "#ffffff" } },
  { keyword: "농협", style: { from: "#1f5c30", to: "#2e7d3f", text: "#ffffff" } },
  { keyword: "카카오뱅크", style: { from: "#7a5f00", to: "#a3820a", text: "#ffffff" } },
  { keyword: "토스", style: { from: "#0f4fb0", to: "#2b7de9", text: "#ffffff" } },
  { keyword: "케이뱅크", style: { from: "#1b1b3a", to: "#2d2d5a", text: "#ffffff" } },
  { keyword: "BC", style: { from: "#8a2a1f", to: "#b3382a", text: "#ffffff" } },
  { keyword: "씨티", style: { from: "#00305c", to: "#00457f", text: "#ffffff" } },
  { keyword: "기업", style: { from: "#00432b", to: "#00623e", text: "#ffffff" } },
];

export function getCardBrandStyle(cardName: string | null | undefined): CardBrandStyle {
  if (!cardName) return FALLBACK_STYLE;
  const matched = CARD_BRAND_STYLES.find((entry) => cardName.includes(entry.keyword));
  return matched?.style ?? FALLBACK_STYLE;
}
