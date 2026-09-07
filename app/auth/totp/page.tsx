import type { Metadata } from "next";
import { Suspense } from "react";
import AdminTotpForm from "./totp-form";

export const metadata: Metadata = {
  title: "관리자 2차 인증 | 포카스테이션",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminTotpPage() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-text-2">
          인증 정보를 확인하고 있어요...
        </p>
      }
    >
      <AdminTotpForm />
    </Suspense>
  );
}
