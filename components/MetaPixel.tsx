"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

/**
 * 메타 픽셀(#564 후속). 광고 전환 측정과 리타기팅에 쓴다. **화면을 그리지 않는다.**
 *
 * <p>키가 없으면 아무것도 로드하지 않는다. 포트원 키와 같은 방식이고, 그래서 키를 주입하지 않은
 * 지면에서는 광고 데이터가 섞이지 않는다 — 켜고 끄는 일이 배포가 아니라 환경변수다.
 *
 * <p><b>autoConfig를 끈다.</b> 기본값이면 픽셀이 버튼 글자와 입력칸 이름을 스스로 걷어 보내고,
 * 자동 고급 매칭으로 페이지의 이메일·전화번호를 해시해 함께 보낸다. 본인확인 정보를 다루는
 * 서비스라 그 경로를 열어 둘 이유가 없다. 처리방침 제8조에 적은 수집 항목(방문이력·검색이력)
 * 밖으로 나가는 것도 막는다 — <b>init보다 먼저 불러야</b> 적용된다.
 *
 * <p>인증 화면은 제외한다. {@code SiteTelemetry}가 외부 분석에서 같은 경로를 빼는 것과 같은
 * 이유다 — PASS 복귀 파라미터가 주소에 실린다.
 *
 * <p>화면 전환마다 PageView를 다시 보낸다. App Router는 이동할 때 문서를 새로 받지 않아 스크립트가
 * 다시 실행되지 않는다. 첫 실행을 건너뛰는 것은 로드 스크립트가 이미 한 번 보냈기 때문이다.
 */
const EXCLUDED_PREFIXES = ["/auth", "/admin"];

function isExcluded(pathname: string) {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function MetaPixel() {
  const pathname = usePathname();
  const loaded = useRef(false);

  useEffect(() => {
    if (!META_PIXEL_ID || isExcluded(pathname)) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!META_PIXEL_ID || isExcluded(pathname)) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${META_PIXEL_ID}');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');
      `}
    </Script>
  );
}
