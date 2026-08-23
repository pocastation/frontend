import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

// page.tsx가 클라이언트 컴포넌트("use client")라 거기서는 metadata를 export할 수 없다.
// 서버 레이아웃으로 감싸 메타만 얹는다(렌더는 그대로 통과시킨다).
export const metadata: Metadata = {
  title: "로그인 — Pocastation",
  description: "포카스테이션에 로그인하고 포토카드 거래에 참여하세요.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "로그인 — Pocastation",
    description: "포카스테이션에 로그인하고 포토카드 거래에 참여하세요.",
    url: "/login",
    // openGraph를 정의하면 루트 OG 이미지 자동 주입이 끊긴다 — 명시해 되살린다(DEFAULT_OG_IMAGE 주석 참고).
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
