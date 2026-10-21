import { envValue } from "./env";

/**
 * 메타 픽셀 설정. 서버(레이아웃 메타데이터)와 클라이언트(`MetaPixel`)가 같은 값을 봐야 해서 한곳에 모은다.
 *
 * 픽셀 ID와 도메인 인증 토큰은 **비밀값이 아니다** — 둘 다 페이지 소스에 그대로 드러난다.
 * 그래도 환경변수로 두는 이유는 지면마다 켜고 끄기 위해서다. 키를 주입하지 않은 지면에서는
 * 픽셀이 로드되지 않아 staging 트래픽이 광고 데이터에 섞이지 않는다.
 */
export const META_PIXEL_ID = envValue(process.env.NEXT_PUBLIC_META_PIXEL_ID);

/**
 * 페이스북 도메인 인증 토큰.
 *
 * 이것이 없으면 애플의 앱 추적 제한(ATT) 때문에 **아이폰 이용자의 전환이 집계되지 않는다** —
 * 픽셀을 심어도 절반이 비는 셈이다. Meta 비즈니스 관리자의 「브랜드 가치 보호 → 도메인」에서
 * 발급한다. DNS TXT로도 할 수 있지만, 레이아웃 메타 태그는 Vercel 환경변수만으로 끝나 더 간단하다.
 */
export const META_DOMAIN_VERIFICATION = envValue(process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION);

// 공식 타입이 없어 쓰는 표면만 선언한다. 우편번호 로더(`lib/postcode.ts`)와 같은 방식.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
