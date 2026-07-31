import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

// login/layout.tsx와 같은 이유 — page.tsx가 클라이언트 컴포넌트라 메타를 서버 레이아웃에서 얹는다.
export const metadata: Metadata = {
  title: "회원가입 — Pocastation",
  description: "포카스테이션 회원이 되어 K-POP 포토카드를 안전하게 사고팔아 보세요.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "회원가입 — Pocastation",
    description: "포카스테이션 회원이 되어 K-POP 포토카드를 안전하게 사고팔아 보세요.",
    url: "/signup",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
