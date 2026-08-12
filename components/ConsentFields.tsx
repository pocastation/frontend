"use client";

import { useId } from "react";
import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

// 가입 동의 값(#217, BE #183). 이메일 가입과 소셜 온보딩이 같은 모양을 쓴다.
export type ConsentValues = {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  ageOver14Confirmed: boolean;
  marketingAgreed: boolean;
};

export const EMPTY_CONSENTS: ConsentValues = {
  termsAgreed: false,
  privacyAgreed: false,
  ageOver14Confirmed: false,
  marketingAgreed: false,
};

export function hasAllRequiredConsents(values: ConsentValues): boolean {
  return values.termsAgreed && values.privacyAgreed && values.ageOver14Confirmed;
}

type Item = {
  key: keyof ConsentValues;
  label: string;
  required: boolean;
  href?: string;
};

// 연령은 생년월일이 아니라 체크로 확인한다(§9 최소수집) — 자기신고인 건 생년월일 입력과 같고,
// 받지 않으면 개인정보를 화면에서조차 다루지 않게 된다.
const ITEMS: Item[] = [
  { key: "termsAgreed", label: "이용약관 동의", required: true, href: "/terms" },
  { key: "privacyAgreed", label: "개인정보 처리방침 동의", required: true, href: "/privacy" },
  { key: "ageOver14Confirmed", label: "만 14세 이상입니다", required: true },
  { key: "marketingAgreed", label: "마케팅 정보 수신 동의", required: false },
];

// 가입 동의 항목(#217). 이메일 가입·소셜 온보딩 공용 — 경로마다 항목이 갈리면 한쪽에 구멍이 생긴다.
//
// 전체 동의는 개별 항목의 파생 상태로만 다룬다(별도 state를 두지 않는다) —
// 두 상태를 따로 관리하면 개별 해제 시 전체 체크가 남는 어긋남이 생긴다.
export default function ConsentFields({
  values,
  onChange,
}: {
  values: ConsentValues;
  onChange: (next: ConsentValues) => void;
}) {
  const allId = useId();
  const allChecked = ITEMS.every((item) => values[item.key]);

  function toggleAll(checked: boolean) {
    onChange({
      termsAgreed: checked,
      privacyAgreed: checked,
      ageOver14Confirmed: checked,
      marketingAgreed: checked,
    });
  }

  return (
    <fieldset className="rounded-r3 border border-border">
      <legend className="sr-only">약관 및 개인정보 동의</legend>

      <label
        htmlFor={allId}
        className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3.5 py-3 text-sm font-bold text-text-1"
      >
        <input
          id={allId}
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
          className={`h-4 w-4 accent-primary ${FOCUS_RING}`}
        />
        전체 동의
      </label>

      <div className="px-3.5 py-2">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5 py-1.5 text-sm">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={values[item.key]}
                onChange={(e) => onChange({ ...values, [item.key]: e.target.checked })}
                className={`h-3.5 w-3.5 shrink-0 accent-primary ${FOCUS_RING}`}
              />
              <span className="min-w-0 text-text-2">
                {/* 필수/선택은 굵기로만 구분 — 색 배지를 쓰면 절제된 톤이 깨진다. */}
                <span className={item.required ? "font-bold text-text-2" : "text-text-3"}>
                  [{item.required ? "필수" : "선택"}]
                </span>{" "}
                {item.label}
              </span>
            </label>
            {item.href && (
              <Link
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={`shrink-0 rounded-r1 text-xs font-semibold text-text-3 underline-offset-2 hover:text-primary hover:underline ${FOCUS_RING}`}
              >
                보기
              </Link>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
