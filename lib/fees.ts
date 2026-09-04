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
 * 제안할 수 있으면 앞뒤가 맞지 않는다.
 *
 * 🔴 <b>실제로 갈렸다.</b> 등록 화면이 `% 1000`을 직접 박아 쓰고 있었고, 단위를 내릴 때 그쪽만
 * `% 500`으로 고쳐져 「판매자는 5,500원에 등록되는데 구매자는 5,500원을 제안할 수 없는」 구간이
 * 생겼다(FE #414 · BE #374). 한 곳에서 내보내 그 여지를 없앤다.
 */
export const PRICE_UNIT = OFFER_UNIT;

/**
 * 등록가 하한(원) — 과저가 낚시·정렬 교란 차단(§12.1). 단위와 목적이 다르므로 함께 바뀌지 않는다.
 *
 * 5,000원에서 500원으로 내렸다(BE #426). 저가 포토카드를 올릴 수 없다는 요청이 근거다.
 * 단위는 500원 그대로라 하한과 단위가 같은 값이 된다.
 */
export const MIN_LISTING_PRICE = 500;

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
/**
 * 판매자 수수료율 — §12.2 확정값. 구간별인 구매자 수수료와 달리 **전 구간 3.5%**다.
 *
 * 🔴 백엔드 `FeePolicy`와 같은 값을 프론트가 들고 있다. 이중화지만, 판매자가 <b>되돌릴 수 없는
 * 선택을 누르기 직전</b>에 실수령액을 보여주려면 수락 전에 계산할 수 있어야 한다 — 수락 응답의
 * `payoutAmount`는 이미 계약이 성립한 뒤에 온다. 값이 갈리면 화면이 거짓말을 하므로
 * **FeePolicy가 바뀌면 여기도 함께 바꿀 것.**
 */
const SELLER_FEE_RATE = 0.035;

/** 판매자가 실제로 받는 금액(수수료 공제 후). 원 단위 절사는 백엔드와 같게 내림으로 맞춘다. */
export function sellerPayout(hammerPrice: number): number {
  return hammerPrice - Math.floor(hammerPrice * SELLER_FEE_RATE);
}

/**
 * 결제 기한 표기 — 백엔드 `PaymentDeadlinePolicy.PAYMENT_WINDOW`와 같은 값(§3.1).
 *
 * 🔴 **문구에 숫자를 직접 쓰지 않는다.** 백엔드가 같은 함정을 이미 밟았다 — 상수는 72시간인데
 * 알림 문구는 48시간이라 서로 다른 말을 하고 있었다(BE #381). 프론트도 문장마다 「48시간」을
 * 박아 두면 정책이 바뀔 때 화면만 옛말을 한다.
 *
 * 이 값은 세 곳이 같아야 한다 — 주문의 결제 기한 · PG 가상계좌 유효기간 · 사용자 안내 문구.
 * 어긋나면 「계좌는 살아 있는데 거래는 이미 취소된」 구간이 생긴다.
 * **`PaymentDeadlinePolicy`가 바뀌면 여기도 함께 바꿀 것.**
 */
export const PAYMENT_WINDOW_TEXT = "48시간";

export function estimatedTotal(hammerPrice: number): number {
  return hammerPrice + buyerFee(hammerPrice);
}

/**
 * 🔴 입금 후 구매자가 취소할 수 있는 최장 구간(§1.5) — 백엔드 `FulfillmentSweeper`의 복제본이다.
 *
 * <p>서버가 이 시간이 지난 주문을 자동으로 잠근다. 화면이 남은 시간을 말하려면 같은 값이
 * 필요한데, 응답에 「언제 잠기는지」를 새로 싣는 대신 `paidAt`에서 계산한다 — 이미 있는 값으로
 * 답할 수 있으면 필드를 늘리지 않는다.
 *
 * ⚠️ 갈리면 「18시간 남았다더니 지금 잠겼다」가 된다. 서버 상수를 고치면 여기도 함께 고칠 것.
 */
export const CANCELLATION_WINDOW_HOURS = 24;

/** 취소가 잠기는 시각 — 입금 시각 + 최장 구간. */
export function cancellationLocksAt(paidAt: string): string {
  return new Date(new Date(paidAt).getTime() + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}
