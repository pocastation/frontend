"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { markNavForward, markNavOpen } from "@/lib/nav-transition";

/**
 * 모바일 화면 전환 방향을 단 링크. `nav="forward"`는 한 단계 들어가며 옆으로 밀고, `nav="open"`은
 * 위저드(판매 등록·교환글 작성·교환 신청)를 아래에서 덮는다.
 * 서버 컴포넌트는 `onNavigate` 함수를 링크에 넘길 수 없어서 이 클라이언트 링크로 감싼다.
 */
export default function NavLink({
  nav,
  ...props
}: Omit<ComponentProps<typeof Link>, "onNavigate"> & { nav: "forward" | "open" }) {
  return <Link {...props} onNavigate={nav === "open" ? markNavOpen : markNavForward} />;
}
