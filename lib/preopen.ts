import { envFlag } from "./env";

/**
 * 가오픈 — 교환만 연다(#798, BE #570).
 *
 * <p>제안판매·즉시판매는 준비 중으로 가린다. <b>화면만 가리는 것이 아니라</b> 서버도 같은
 * 이름의 게이트(`app.sale.enabled`)로 새 거래를 막는다 — 화면이 막는 것과 서버가 막는 것은
 * 다르다(T37).
 *
 * <p><b>기본이 꺼짐인 이유.</b> staging과 상용이 같은 백엔드를 보는데 그쪽 상용 설정이 닫혀
 * 있다. 프론트 기본을 켜짐으로 두면 staging 화면만 판매를 보여 주고 누르면 403이 난다 —
 * 보이는 것과 되는 것이 어긋나는 쪽이 더 나쁘다.
 *
 * <p>여는 날에는 `NEXT_PUBLIC_SALE_ENABLED=true`를 넣거나 이 기본값을 바꾼다. 백엔드
 * `app.sale.enabled`도 함께 열어야 한다 — 한쪽만 열면 화면은 보이는데 눌리지 않는다.
 */
export const SALE_ENABLED = envFlag(process.env.NEXT_PUBLIC_SALE_ENABLED, false);
