// 입찰 정책 상수(§12.1 확정) — 백엔드 Auction 도메인과 동일 값. 프론트는 입력 UX(±버튼·범위 클램프)
// 용도로만 쓰고, 실제 검증·확정은 백엔드가 단일 진실원으로 수행한다.
export const BID_MIN_INCREMENT = 1000; // 1호가
export const BID_MAX_JUMP = 10000; // 현재가 + 최대 10호가

/**
 * 다음 입찰 최소가. 첫 입찰(bidCount 0)은 시작가(=현재가) 그대로 허용(A안),
 * 이후는 현재가 + 1호가부터.
 */
export function minNextBid(currentPrice: number, bidCount: number): number {
  return bidCount === 0 ? currentPrice : currentPrice + BID_MIN_INCREMENT;
}

/** 이번 입찰의 상한 = 현재가 + 10호가. */
export function maxNextBid(currentPrice: number): number {
  return currentPrice + BID_MAX_JUMP;
}

// 구매자 수수료율(낙찰가 구간별, §12.2 확정). 경계는 ≤30,000 / ≤100,000 / >100,000.
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

/** 예상 결제 총액 = 낙찰가 + 구매자 수수료. 배송비는 판매자 부담이라 별도 청구하지 않는다. */
export function estimatedTotal(hammerPrice: number): number {
  return hammerPrice + buyerFee(hammerPrice);
}
