"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { PRE_REGISTRATION_CONSENT } from "@/lib/privacy-content";
import { FOCUS_RING } from "@/lib/ui";

// 선택지는 "고르기 쉬운 상위 몇 개 + 기타"다. 전체 목록을 넣으면 스크롤이 길어져
// 오히려 이탈하고, 어차피 그룹은 계속 생겨서 완전한 목록이 불가능하다.
const GROUPS = [
  "NCT / NCT DREAM",
  "세븐틴 (SEVENTEEN)",
  "뉴진스 (NewJeans)",
  "에스파 (aespa)",
  "스트레이 키즈 (Stray Kids)",
  "BTS",
  "르세라핌 (LE SSERAFIM)",
  "IVE",
  "TWS",
];
const OTHER = "기타";

const INPUT_CLASS =
  "h-12 w-full rounded-[4px] border border-border-2 bg-white px-3.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary";

/**
 * 입력 중에 하이픈을 끼워 넣는다.
 *
 * 서버가 어차피 정규화하므로 저장에는 영향이 없지만, 11자리 숫자가 이어 붙은 화면은
 * 사용자가 자기 번호를 눈으로 검산하지 못한다. 오타를 본인이 잡게 하려는 표시용 처리다.
 */
function formatPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

type Status = "idle" | "sending" | "done";

export default function PreRegistrationForm() {
  // 유입 경로(?source=instagram 등)는 여기서 읽는다. 서버 컴포넌트의 searchParams로 받으면
  // 페이지 전체가 동적 렌더링으로 내려가 캐시가 안 된다 — 홍보 랜딩은 트래픽이 몰릴 수 있어
  // 페이지는 정적으로 두고 경로 파싱만 이 아일랜드가 맡는다.
  const source = useSearchParams().get("source") ?? undefined;
  const uid = useId();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState("");
  const [customGroup, setCustomGroup] = useState("");
  const [role, setRole] = useState<"SELLER" | "BUYER" | "">("");
  const [agreed, setAgreed] = useState(false);
  const [openConsent, setOpenConsent] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const resolvedGroup = group === OTHER ? customGroup.trim() : group;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    // 브라우저 기본 검증에 맡기지 않고 직접 본다 — 에러 문구를 항목별로 다르게 줘야 하고,
    // 커스텀 컨트롤(역할 버튼·동의 체크박스)은 required로 표현되지 않는다.
    if (phone.replace(/[^0-9]/g, "").length !== 11) {
      setError("휴대폰 번호 11자리를 정확히 입력해 주세요.");
      return;
    }
    if (!resolvedGroup) {
      setError("주로 거래하는 그룹을 알려주세요.");
      return;
    }
    if (!role) {
      setError("판매자인지 구매자인지 선택해 주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해 주세요.");
      return;
    }

    setError(null);
    setStatus("sending");
    try {
      const query = source ? `?source=${encodeURIComponent(source)}` : "";
      await apiFetch<void>(`/api/pre-registrations/applications${query}`, {
        method: "POST",
        body: {
          phone,
          email: email.trim() || null,
          idolGroup: resolvedGroup,
          role,
          privacyAgreed: true,
        },
      });
      setStatus("done");
    } catch (e) {
      // 서버가 이유를 코드로 알려준다. 전부 "실패했어요"로 뭉개면 사용자가 뭘 고쳐야 할지 모른다.
      const code = e instanceof ApiError ? e.errorCode : null;
      if (code === "PRE_REGISTRATION_DUPLICATE_PHONE") {
        setError("이미 사전 신청된 번호예요. 오픈하면 이 번호로 알려드릴게요.");
      } else if (e instanceof ApiError && e.status === 429) {
        setError("잠시 후 다시 시도해 주세요.");
      } else {
        setError(e instanceof ApiError ? e.message : "신청에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-[6px] border border-border-2 bg-white p-6 sm:p-7" id="apply">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-primary">신청 완료</p>
        <h2 className="mt-2 font-display text-[20px] font-extrabold tracking-[-0.03em] text-text-1">
          사전 신청이 접수됐어요
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.75] text-text-2">
          정식 오픈 소식을 가장 먼저 알려드릴게요. 남겨주신 이메일로 안내가 나가고, 사전 신청 혜택도
          그때 함께 챙겨드려요.
        </p>
        <Link
          href="/auctions"
          className={`mt-5 inline-flex h-11 items-center rounded-[4px] border border-border-2 px-5 text-[13.5px] font-bold text-text-1 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
        >
          지금 올라온 매물 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <form
      id="apply"
      onSubmit={submit}
      noValidate
      className="scroll-mt-20 rounded-[6px] border border-border-2 bg-white p-5 sm:p-6"
    >
      <h2 className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-text-1">
        사전 신청하고 혜택 받기
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-[1.65] text-text-3">
        정식 오픈 소식을 가장 먼저 알려드리고, 사전 신청자에게만 드리는 얼리어답터 배지를 드려요.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor={`${uid}-phone`} className="flex items-baseline gap-1">
            <span className="text-[13px] font-extrabold text-text-1">휴대폰 번호</span>
            <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
              *
            </span>
          </label>
          <input
            id={`${uid}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={13}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-1234-5678"
            className={`mt-2 ${INPUT_CLASS} ${FOCUS_RING}`}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-email`} className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-extrabold text-text-1">이메일</span>
            <span className="text-[11px] font-bold text-text-3">선택</span>
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className={`mt-2 ${INPUT_CLASS} ${FOCUS_RING}`}
          />
          {/* 지금 실제로 알림이 나가는 유일한 수단이라, 선택 항목이어도 이유를 밝혀 적어둔다. */}
          <p className="mt-1.5 text-[12px] leading-[1.65] text-text-3">
            오픈 안내는 이메일로 보내드려요. 남겨주시면 더 확실하게 받아보실 수 있어요.
          </p>
        </div>

        <div>
          <label htmlFor={`${uid}-group`} className="flex items-baseline gap-1">
            <span className="text-[13px] font-extrabold text-text-1">주로 거래하는 그룹</span>
            <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
              *
            </span>
          </label>
          <select
            id={`${uid}-group`}
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              if (e.target.value !== OTHER) setCustomGroup("");
            }}
            className={`mt-2 ${INPUT_CLASS} ${FOCUS_RING}`}
          >
            <option value="">선택해 주세요</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={OTHER}>{OTHER}</option>
          </select>
          {group === OTHER && (
            <input
              type="text"
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value)}
              maxLength={50}
              placeholder="예) 엔하이픈, 트레저"
              aria-label="그룹 직접 입력"
              className={`mt-2 ${INPUT_CLASS} ${FOCUS_RING}`}
            />
          )}
        </div>

        <div>
          <span className="flex items-baseline gap-1">
            <span className="text-[13px] font-extrabold text-text-1">주로 어느 쪽인가요</span>
            <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
              *
            </span>
          </span>
          {/* 라디오 그룹 — 버튼 두 개로 보이지만 의미는 택일이라 role로 그렇게 알린다. */}
          <div role="radiogroup" aria-label="주 이용 형태" className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["SELLER", "판매자"],
                ["BUYER", "구매자"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                onClick={() => setRole(value)}
                className={`flex h-12 items-center justify-center gap-2 rounded-[4px] border text-[14px] font-bold transition-colors ${FOCUS_RING} ${
                  role === value
                    ? "border-primary text-primary"
                    : "border-border-2 text-text-2 hover:border-text-3"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] ${
                    role === value ? "border-primary" : "border-border-2"
                  }`}
                >
                  {role === value && <span className="h-[7px] w-[7px] rounded-full bg-primary" />}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 동의 — 체크박스 옆에서 바로 수집 항목을 펼쳐볼 수 있어야 한다.
          "동의합니다"만 두고 내용을 다른 페이지에만 두면 동의를 받았다고 보기 어렵다. */}
      <div className="mt-5 border-t border-border pt-4">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className={`mt-0.5 h-[18px] w-[18px] shrink-0 accent-primary ${FOCUS_RING}`}
          />
          <span className="text-[13px] leading-[1.6] text-text-1">
            <b className="font-extrabold text-primary">[필수]</b> 개인정보 수집·이용에 동의합니다.
          </span>
        </label>

        <button
          type="button"
          onClick={() => setOpenConsent((v) => !v)}
          aria-expanded={openConsent}
          className={`mt-2 rounded-r1 text-[12px] font-bold text-text-3 underline underline-offset-4 transition-colors hover:text-text-1 ${FOCUS_RING}`}
        >
          {openConsent ? "수집 내용 접기" : "수집 내용 보기"}
        </button>

        {openConsent && (
          <dl className="mt-2.5 flex flex-col gap-1.5 border-l-2 border-border-2 pl-3.5 text-[12px] leading-[1.7] text-text-3">
            <div className="flex gap-2">
              <dt className="w-[52px] shrink-0 font-bold text-text-2">수집 항목</dt>
              <dd>{PRE_REGISTRATION_CONSENT.items}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-[52px] shrink-0 font-bold text-text-2">이용 목적</dt>
              <dd>{PRE_REGISTRATION_CONSENT.purpose}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-[52px] shrink-0 font-bold text-text-2">보유 기간</dt>
              <dd>{PRE_REGISTRATION_CONSENT.retention}</dd>
            </div>
            <p className="mt-1">
              동의를 거부하실 수 있으며, 이 경우 사전 신청이 제한돼요.{" "}
              <Link
                href="/privacy"
                className={`font-bold text-primary underline underline-offset-4 ${FOCUS_RING}`}
              >
                전문 보기
              </Link>
            </p>
          </dl>
        )}
      </div>

      {/* aria-live로 두어 스크린리더 사용자도 제출 실패를 알 수 있게 한다. */}
      <p aria-live="polite" className="mt-3 min-h-[18px] text-[12.5px] font-bold text-danger">
        {error}
      </p>

      <button
        type="submit"
        disabled={status === "sending"}
        className={`mt-1 flex h-[52px] w-full items-center justify-center rounded-[4px] bg-primary text-[15px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
      >
        {status === "sending" ? "신청 중..." : "사전 신청하기"}
      </button>
    </form>
  );
}
