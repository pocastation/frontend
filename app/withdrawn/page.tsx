import Link from "next/link";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

/**
 * 회원 탈퇴 완료 화면(#567, 시안 승인 2026-09-05).
 *
 * <p>예전에는 탈퇴가 끝나면 홈으로 보내며 `?withdrawn=1`을 붙였는데 그 값을 읽는 코드가 없었고,
 * 같은 순간 로그인 상태가 풀리면서 마이페이지의 비로그인 가드가 `/login?redirect=/mypage`로
 * 먼저 이동시켰다 — 방금 탈퇴한 사람이 로그인 폼을 봤다(로컬 실측). 떨어질 자리를 따로 만든다.
 *
 * <p>골격은 등록완료 화면(#515)과 같다 — 3px 보라 바 → 오버라인 → 제목 → 본문 → 헤어라인 표 →
 * CTA. 표는 순서가 아니라 사실 셋이라 번호를 붙이지 않는다. 문구는 계정 설정 탭이 탈퇴 전에
 * 보여준 세 줄과 같은 사실만 말한다 — 새 약속은 없다.
 *
 * <p>비회원 공개 경로다(탈퇴 직후는 로그아웃 상태). 새로고침해도 그대로 보인다. 모바일은 앱바
 * 하나(닫기 → 홈)이고 하단 5탭은 숨긴다(shell-routes·MobileTabBar). 데스크탑은 전역 헤더 그대로 —
 * 로그인·가입 화면과 같은 처리다.
 */

// 표 3행 — 파기·보존·재가입. 이용 제한 이력 승계는 실제 동작(PenaltyCarryover)이라 미리 알린다.
const FACTS: { term: string; detail: React.ReactNode }[] = [
  { term: "파기된 정보", detail: "이메일·닉네임·배송지·정산계좌·환불계좌" },
  {
    term: "남는 기록",
    detail: (
      <>
        가격 제안·거래 기록은 법령에 따라 보관하되{" "}
        <strong className="font-bold text-text-1">누구인지 알 수 없게</strong> 처리돼요
      </>
    ),
  },
  { term: "다시 가입", detail: "언제든 새 계정으로 시작할 수 있어요. 이전 계정의 이용 제한 이력은 이어져요" },
];

export default function WithdrawnPage() {
  return (
    <>
      {/* 뒤로가 아니라 닫기다 — 뒤로 가면 방금 탈퇴한 계정의 마이페이지로 돌아가 로그인으로 밀린다. */}
      <MobilePageHead title="탈퇴 완료" variant="close" backHref="/" />

      {/* 레이아웃이 이미 <main>으로 감싼다 — 여기서 또 쓰면 main이 중첩된다(#515). */}
      <div className="mx-auto w-full max-w-[560px] px-[14px] py-9 sm:px-5 sm:py-20">
        <span aria-hidden="true" className="block h-[3px] w-7 bg-primary" />
        <p className="mt-4 text-[11.5px] font-bold tracking-[0.08em] text-text-3">회원 탈퇴</p>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-[1.25] tracking-[-0.03em] text-text-1 sm:text-[26px]">
          탈퇴가 완료됐어요
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-text-2">
          그동안 포카스테이션을 이용해 주셔서 고마워요. 계정 정보는 파기됐고, 되돌릴 수 없어요.
        </p>

        <dl className="mt-7 border-t border-border">
          {FACTS.map((fact) => (
            <div
              key={fact.term}
              className="grid grid-cols-[84px_1fr] gap-3 border-b border-border py-3 text-[12.5px] leading-[1.55] sm:grid-cols-[110px_1fr] sm:text-[13px]"
            >
              <dt className="font-bold text-text-3">{fact.term}</dt>
              <dd className="m-0 text-text-2">{fact.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/"
            className={`inline-flex h-12 items-center justify-center px-5 sm:w-[200px] ${PRIMARY_BUTTON_CLASS}`}
          >
            홈으로
          </Link>
          <Link
            href="/privacy"
            className="text-center text-[12.5px] text-text-3 underline decoration-text-3 underline-offset-[3px] hover:text-text-2"
          >
            개인정보 처리방침에서 보관 기간 보기
          </Link>
        </div>
      </div>
    </>
  );
}
