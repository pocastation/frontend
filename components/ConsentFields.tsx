"use client";

import { useId } from "react";
import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

// 가입 동의 값(#217, BE #183). 이메일 가입과 소셜 온보딩이 같은 모양을 쓴다.
export type ConsentValues = {
  termsAgreed: boolean;
  personalInfoAgreed: boolean;
  ageOver14Confirmed: boolean;
  marketingAgreed: boolean;
};

export const EMPTY_CONSENTS: ConsentValues = {
  termsAgreed: false,
  personalInfoAgreed: false,
  ageOver14Confirmed: false,
  marketingAgreed: false,
};

// 필수는 약관과 연령 확인 둘뿐이다(2026-08-13). 선택 동의를 거부했다고 가입을 막으면
// 그것 자체가 §16③ 위반이다.
export function hasAllRequiredConsents(values: ConsentValues): boolean {
  return values.termsAgreed && values.ageOver14Confirmed;
}

type Item = {
  key: keyof ConsentValues;
  label: string;
  required: boolean;
  href?: string;
};

/**
 * 가입 동의 항목(#217). 이메일 가입·소셜 온보딩 공용 — 경로마다 항목이 갈리면 한쪽에 구멍이 생긴다.
 *
 * ⚠️ **개인정보 처리방침은 동의 항목이 아니다**(2026-08-13, 법무법인 미션 코멘트 #0).
 * 처리방침은 법 §30에 따라 **공개하는** 문서이지 동의를 받는 문서가 아니고, 동의를 받아야 하는
 * 것은 개인정보 수집·이용 동의서다. 그마저도 우리가 필수로 수집하는 항목은 전부 §15①4
 * (계약의 이행)가 근거라 애초에 동의 대상이 아니었다.
 *
 * 그래서 체크박스에서 빼고 아래 열람 링크로 내렸다. **다시 체크박스로 올리지 말 것.**
 *
 * 연령은 생년월일이 아니라 체크로 확인한다(§9 최소수집) — 자기신고인 건 생년월일 입력과 같고,
 * 받지 않으면 개인정보를 화면에서조차 다루지 않게 된다.
 */
const ITEMS: Item[] = [
  { key: "termsAgreed", label: "이용약관 동의", required: true, href: "/terms" },
  { key: "ageOver14Confirmed", label: "만 14세 이상입니다", required: true },
  // ⚠️ **범위를 앞에 둔다.** 「개인정보 수집·이용 동의」로 시작하면 *모든* 개인정보에 대한
  // 동의처럼 읽힌다 — 실제로 그렇게 오해한 사례가 있었다. 이 동의가 가리키는 것은 맞춤형
  // 서비스뿐이고, 회원가입·주문·배송에 필요한 정보는 계약 이행(§15①4)이 근거라 여기에
  // 포함되지 않는다. 거부해도 잃는 것은 추천·개인화뿐이다.
  {
    key: "personalInfoAgreed",
    label: "맞춤형 서비스를 위한 개인정보 수집·이용 동의",
    required: false,
    href: "/privacy",
  },
  // 채널을 문구에 적는다 — 이메일 동의가 알림톡 동의를 겸하지 않는다(정보통신망법 §50).
  { key: "marketingAgreed", label: "이메일·알림톡 수신 동의", required: false },
];

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
      personalInfoAgreed: checked,
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

      {/* 처리방침은 '동의'가 아니라 '열람'이다. 체크박스 묶음 밖에 두어 성격이 다르다는 것을
          배치로 드러낸다 — 같은 목록에 넣으면 다시 동의 항목처럼 읽힌다.

          첫 문장이 **필수 항목의 근거**를 밝힌다. 체크박스에 없는 정보(이메일·주소 등)를 어떻게
          처리하는지 화면 어디에도 없으면, 위의 선택 동의가 그 전부를 가리키는 것처럼 읽힌다. */}
      <p className="border-t border-border px-3.5 py-2.5 text-xs leading-[1.7] text-text-3">
        회원가입·주문·배송에 필요한 개인정보는 계약 이행을 위해 처리되며, 처리 목적·항목·보유기간은{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className={`font-semibold text-text-2 underline underline-offset-2 hover:text-primary ${FOCUS_RING}`}
        >
          개인정보 처리방침
        </Link>
        에서 확인하실 수 있어요.
      </p>
    </fieldset>
  );
}
