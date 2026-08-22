import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/site";

/**
 * 상용이 아닌 지면임을 알리는 띠 — 화면 맨 위, 상용에서는 렌더되지 않는다.
 *
 * <p>배포 게이트에서 `staging.pocastation.com`이 `develop`을 미리 보는 자리가 됐는데,
 * <b>백엔드가 하나뿐이라 그 지면은 실 DB를 그대로 본다</b>(같은 ALB → 같은 ECS → 같은 RDS).
 * 화면이 상용과 똑같이 생겼으므로, 여기가 어디인지 말해주지 않으면 <b>연습이라 생각하고 누른
 * 입찰이 진짜 입찰</b>이 된다. 그래서 이 띠의 목적은 «어디인가»가 아니라 «무엇이 진짜인가»다.
 *
 * <p>고정(sticky)하지 않는다. 스크롤하면 자연스럽게 밀려 올라가고, 그 아래 sticky 헤더·앱바가
 * 원래대로 `top-0`에 붙는다 — 높이를 계산해 얹는 방식은 헤더가 셋(데스크탑·모바일 셸·서브 앱바)이라
 * 어디선가 반드시 어긋난다.
 */
export default function PreProductionBar() {
  if (IS_PRODUCTION_SITE) return null;

  const host = SITE_URL.replace(/^https?:\/\//, "");

  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-center gap-x-2 bg-text-1 px-3 py-1 text-center text-[11px] leading-tight text-white"
    >
      <span className="font-extrabold tabular-nums">{host}</span>
      <span className="text-white/70">상용이 아닙니다 · 실 데이터를 그대로 씁니다</span>
    </div>
  );
}
