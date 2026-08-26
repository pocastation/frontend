// 가격 제안 정책 상수 — 백엔드 Auction 도메인과 동일 값. 프론트는 입력 UX에 사용하고,
// 실제 검증·확정은 백엔드가 단일 진실원으로 수행한다.
export const BID_MIN_INCREMENT = 1_000; // 가격 제안 입력 단위

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
