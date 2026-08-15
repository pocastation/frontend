/**
 * 환경변수 값 정리(FE #337).
 *
 * <p><b>왜 필요한가.</b> 2026-08-15 staging 결제가 통째로 막혔는데, 원인은 Vercel에 붙여넣은
 * 채널키 <b>앞에 탭 문자가 하나 딸려 들어간 것</b>이었다. 번들에는
 * {@code channelKey:"\tchannel-key-90fe..."} 로 박혀 있었고 PG는
 * {@code channelKey is not correct} 를 반환했다.
 *
 * <p><b>눈으로는 절대 안 보인다.</b> 대시보드에서도, 값을 다시 복사해 비교해도 같아 보인다.
 * 실제로 이 문제를 찾는 데 여러 차례 잘못된 진단을 거쳤다. 대시보드 붙여넣기에서 앞뒤 공백이
 * 섞이는 건 흔한 실수이므로 <b>코드가 방어하는 게 맞다.</b>
 *
 * <p>⚠️ <b>플래그성 값은 더 위험하다.</b> {@code process.env.X === "true"} 같은 비교는 공백이
 * 섞이면 예외도 없이 <b>반대로 동작</b>한다. 결제처럼 크게 깨지지도 않아 훨씬 늦게 발견된다.
 *
 * <p>Next가 {@code NEXT_PUBLIC_*}를 빌드 타임에 인라인하려면 <b>정적 참조</b>가 필요하므로
 * (`process.env[name]` 같은 동적 접근은 치환되지 않는다) 이름이 아니라 <b>이미 읽은 값</b>을 받는다.
 */
export function envValue(raw: string | undefined): string {
  return (raw ?? "").trim();
}

/** 불리언 플래그. 공백이 섞여도 뒤집히지 않게 정리한 뒤 비교한다. */
export function envFlag(raw: string | undefined, fallback: boolean): boolean {
  const value = envValue(raw).toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}
