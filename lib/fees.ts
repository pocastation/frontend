/**
 * 제안 금액의 단위(원) — 백엔드 `Auction.AMOUNT_UNIT`과 같은 값.
 *
 * 프론트는 입력 UX(± 버튼·클램프) 용도로만 쓰고, 실제 검증은 백엔드가 단일 진실원으로 한다.
 *
 * 🔴 **「최소 증분」이 아니다.** 거래 개편 §2.3이 폐기한 것은 **현재가를 기준으로 한** 하한
 * (「현재가 + 1단위 이상」)과 상한(「현재가 + 10단위까지」)이다 — 호가가 비공개가 된 마당에
 * 보이지도 않는 값을 기준으로 삼으면 눈 감고 과녁 맞히기가 된다.
 *
 * 지금 남은 금액 규칙은 하나다 — **최소가 이상이면 어떤 금액이든.** 단위만 맞춘다.
 *
 * 🔴 1,000원 → **500원**으로 낮췄다(#412). 포토카드 가격대가 5,000~20,000원에 몰려 있어
 * 1,000원 눈금은 굵다 — 6,500원을 부르고 싶은 사람이 6,000이나 7,000으로 밀려난다.
 */
export const OFFER_UNIT = 500;

/**
 * 등록가(시작 제안가·즉시판매가)의 단위 — 백엔드 `AuctionRegisterService.PRICE_UNIT`과 같은 값.
 *
 * 🔴 **제안 단위와 반드시 같아야 한다.** 판매자가 5,500원에 등록할 수 없는데 구매자만 5,500원을
 * 제안할 수 있으면 앞뒤가 맞지 않는다. 예전에는 등록 화면이 `% 1000`을 직접 박아 써서 두 값이
 * 갈릴 수 있었다 — 한 곳에서 내보내 그 여지를 없앤다.
 */
export const PRICE_UNIT = OFFER_UNIT;

/** 등록가 하한(원) — 과저가 낚시·정렬 교란 차단(§12.1). 단위와 목적이 다르므로 함께 바뀌지 않는다. */
export const MIN_LISTING_PRICE = 5000;

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
