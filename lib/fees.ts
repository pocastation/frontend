/**
 * 제안 금액의 단위(원) — 백엔드 `Auction.AMOUNT_UNIT`과 같은 값.
 *
 * 프론트는 입력 UX(± 버튼·클램프) 용도로만 쓰고, 실제 검증은 백엔드가 단일 진실원으로 한다.
 *
 * 🔴 **「최소 증분」이 아니다.** 거래 개편 §2.3이 폐기한 것은 **현재가를 기준으로 한** 하한
 * (「현재가 + 1단위 이상」)과 상한(「현재가 + 10단위까지」)이다 — 호가가 비공개가 된 마당에
 * 보이지도 않는 값을 기준으로 삼으면 눈 감고 과녁 맞히기가 된다.
 *
 * 지금 남은 금액 규칙은 하나다 — **최소가 이상이면 어떤 금액이든.** 단위만 1,000원으로 맞춘다.
 */
export const OFFER_UNIT = 1000;

// 구매자 수수료율(거래가 구간별, §12.2 확정). 경계는 ≤30,000 / ≤100,000 / >100,000.
function buyerFeeRate(hammerPrice: number): number {
  if (hammerPrice <= 30000) return 0.075;
  if (hammerPrice <= 100000) return 0.07;
  return 0.065;
}

/**
 * 구매자 수수료(원 단위 반올림). 프론트 표시용 추정치 — 실제 청구액은 order/payment 도메인이
 * 확정한다(§12.2 "예상 결제 총액 실시간 표시" 요구사항).
 */
export function buyerFee(hammerPrice: number): number {
  return Math.round(hammerPrice * buyerFeeRate(hammerPrice));
}

/** 예상 결제 총액 = 거래가 + 구매자 수수료. 배송비는 판매자 부담이라 별도 청구하지 않는다. */
export function estimatedTotal(hammerPrice: number): number {
  return hammerPrice + buyerFee(hammerPrice);
}
