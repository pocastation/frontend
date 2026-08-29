"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { BankAccount, BankOption } from "@/lib/types";

/**
 * 계좌 등록 화면. <b>정산계좌(#258)와 환불계좌(#390)가 같은 컴포넌트를 쓴다.</b>
 *
 * <p>둘은 방향만 반대일 뿐 절차가 같다 — 은행·계좌번호·예금주를 받고, <b>저장 직전에 눈으로
 * 확인시키고</b>, 등록 뒤에는 뒤 4자리만 보여준다. 한 벌을 더 두면 그 절차가 갈린다: 확인
 * 단계를 한쪽에서만 고치거나, 자릿수 검사가 달라지는 식이다.
 *
 * <p>다른 것은 <b>문구와 경로뿐</b>이라 아래 표 하나로 모았다.
 */
type Purpose = "settlement" | "refund";

const COPY = {
  settlement: {
    path: "/api/members/me/settlement-account",
    noun: "정산계좌",
    loadFail: "정산계좌를 불러오지 못했어요.",
    registered: "정산계좌를 등록했어요.",
    unavailable: "지금은 정산계좌를 등록할 수 없어요. 잠시 후 다시 시도해 주세요.",
    deleteConfirm: "등록된 정산계좌를 삭제할까요? 판매 대금을 받으려면 다시 등록해야 해요.",
    deleted: "정산계좌를 삭제했어요.",
    emptyTitle: "등록된 정산계좌가 없어요.",
    emptyDesc: "판매 대금은 구매확정 후 이 계좌로 들어와요. 등록해 두지 않으면 거래가 성사돼도 대금을 보내드릴 수 없어요.",
    emptyCta: "정산계좌 등록",
    confirmLead: "이 계좌로 판매 대금을 보내드려요.",
  },
  refund: {
    path: "/api/members/me/refund-account",
    noun: "환불계좌",
    loadFail: "환불계좌를 불러오지 못했어요.",
    registered: "환불계좌를 등록했어요.",
    unavailable: "지금은 환불계좌를 등록할 수 없어요. 잠시 후 다시 시도해 주세요.",
    deleteConfirm: "등록된 환불계좌를 삭제할까요? 거래가 취소되면 돌려드릴 곳이 없어져요.",
    deleted: "환불계좌를 삭제했어요.",
    emptyTitle: "등록된 환불계좌가 없어요.",
    emptyDesc: "결제는 가상계좌·계좌이체라 환불도 계좌로 보내드려요. 등록해 두지 않으면 취소가 확정돼도 돈을 돌려드릴 수 없어요.",
    emptyCta: "환불계좌 등록",
    confirmLead: "이 계좌로 환불금을 보내드려요.",
  },
} as const;

// 라벨보다 입력칸이 커야 눈이 입력할 곳으로 먼저 간다(CLAUDE.md 「디자인」).
const FIELD =
  `h-12 w-full rounded-r2 border border-border px-3.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`;

type Step = "view" | "form" | "confirm";

export default function BankAccountManager({ purpose }: { purpose: Purpose }) {
  const { fetchWithAuth } = useAuth();
  const copy = COPY[purpose];

  const [account, setAccount] = useState<BankAccount | null>(null);
  // 🔴 「정산계좌와 동일」은 환불계좌에서만 뜬다. 정산계좌가 실제로 등록돼 있어야 의미가 있어
  // 그 존재 여부를 함께 읽는다 — 없으면 줄 자체를 그리지 않는다.
  const [settlementAccount, setSettlementAccount] = useState<BankAccount | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("view");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");

  useEffect(() => {
    let alive = true;
    // 미등록은 404다(정상 상태) — 그때만 조용히 넘긴다. 그 외 오류는 사용자에게 알린다.
    Promise.all([
      fetchWithAuth<BankAccount>(copy.path).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
      // 은행 목록은 정산계좌 것을 그대로 쓴다 — 같은 Bank enum이다.
      apiFetch<BankOption[]>("/api/settlement-accounts/banks"),
      purpose === "refund"
        ? fetchWithAuth<BankAccount>(COPY.settlement.path).catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 404) return null;
            throw err;
          })
        : Promise.resolve(null),
    ])
      .then(([saved, bankList, settlement]) => {
        if (!alive) return;
        setAccount(saved);
        setBanks(bankList);
        setSettlementAccount(settlement);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setMessage({
          type: "err",
          text: err instanceof ApiError ? err.message : copy.loadFail,
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [copy.path, copy.loadFail, fetchWithAuth, purpose, reloadKey]);

  function startEditing() {
    setBank(account?.bank ?? "");
    setAccountNumber("");
    setHolderName(account?.holderName ?? "");
    setError(null);
    setMessage(null);
    setStep("form");
  }

  function goConfirm() {
    if (!bank) {
      setError("은행을 선택해 주세요.");
      return;
    }
    // 하이픈은 서버가 걷어내지만, 자릿수 미달은 확인 화면까지 가기 전에 잡아준다.
    if (accountNumber.replace(/[-\s]/g, "").length < 6) {
      setError("계좌번호를 정확히 입력해 주세요.");
      return;
    }
    if (!holderName.trim()) {
      setError("예금주명을 입력해 주세요.");
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<BankAccount>(copy.path, {
        method: "PUT",
        body: { bank, accountNumber, holderName: holderName.trim() },
      });
      setStep("view");
      setMessage({ type: "ok", text: copy.registered });
      setReloadKey((k) => k + 1);
    } catch (err) {
      // 키 미설정(503)은 사용자 잘못이 아니다 — 입력을 고치라고 하면 계속 헛수고한다.
      if (err instanceof ApiError && err.errorCode === "FIELD_ENCRYPTION_UNAVAILABLE") {
        setError(copy.unavailable);
      } else {
        setError(err instanceof ApiError ? err.message : "등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      setStep("form");
    } finally {
      setBusy(false);
    }
  }

  /**
   * 「정산계좌와 동일하게 사용」.
   *
   * <p>🔴 <b>폼을 채우는 것이 아니라 등록을 끝낸다.</b> 조회 응답에는 뒤 4자리만 실려서 화면은
   * 원래 계좌번호를 모른다 — 평문을 내려보내 되받게 만들면 「조회에서 복호화하지 않는다」는
   * 규칙이 무너지므로, 서버가 <b>암호문째</b> 옮긴다(BE #390).
   */
  async function copyFromSettlement() {
    setBusy(true);
    setError(null);
    try {
      const copied = await fetchWithAuth<BankAccount>(`${copy.path}/copy-from-settlement`, { method: "POST" });
      setAccount(copied);
      setStep("view");
      setMessage({ type: "ok", text: copy.registered });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "정산계좌를 가져오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }
    setBusy(true);
    try {
      await fetchWithAuth<void>(copy.path, { method: "DELETE" });
      setAccount(null);
      setMessage({ type: "ok", text: copy.deleted });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "삭제에 실패했어요." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-text-3">불러오는 중...</p>;
  }

  const selectedBankName = banks.find((b) => b.code === bank)?.name ?? bank;

  return (
    <div className="max-w-md">
      {message && (
        <p
          role={message.type === "err" ? "alert" : "status"}
          className={`mb-4 text-sm font-bold ${message.type === "err" ? "text-accent" : "text-ok"}`}
        >
          {message.text}
        </p>
      )}

      {step === "view" && (account ? <Registered /> : <Empty />)}

      {step === "form" && (
        <div>
          {/* 대부분 같은 계좌인데 별도 테이블이라 두 번 입력하게 된다. 손으로 다시 치게 두면
              오타 하나가 남에게 송금되는 결과라, 옮기는 편이 안전하기도 하다. 정산계좌가
              없으면 줄 자체를 그리지 않는다 — 누를 수 없는 버튼을 보여줄 이유가 없다. */}
          {purpose === "refund" && settlementAccount && (
            <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
              <span className="flex-1 text-[12.5px] leading-relaxed text-text-2">
                정산계좌로{" "}
                <b className="font-bold text-text-1">
                  {settlementAccount.bankName} {settlementAccount.maskedAccountNumber}
                </b>
                이 등록돼 있어요.
              </span>
              <button
                type="button"
                onClick={() => void copyFromSettlement()}
                disabled={busy}
                className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
              >
                동일하게 사용
              </button>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="bank" className="mb-1.5 block text-[13px] font-bold text-text-2">
                은행
              </label>
              <select
                id="bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className={FIELD}
              >
                <option value="">선택해 주세요</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="accountNumber" className="mb-1.5 block text-[13px] font-bold text-text-2">
                계좌번호
              </label>
              <input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="계좌번호 입력"
                className={FIELD}
              />
              <p className="mt-1.5 text-[12px] text-text-3">- 없이 입력해도 되고, 있어도 괜찮아요.</p>
            </div>

            <div>
              <label htmlFor="holderName" className="mb-1.5 block text-[13px] font-bold text-text-2">
                예금주
              </label>
              <input
                id="holderName"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                autoComplete="off"
                placeholder="예금주 입력"
                className={FIELD}
              />
              <p className="mt-1.5 text-[12px] text-text-3">본인 명의 계좌만 등록할 수 있어요.</p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[13px] font-bold text-accent">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {account && (
              <button
                type="button"
                onClick={() => setStep("view")}
                className={`px-5 py-2.5 ${SECONDARY_BUTTON_CLASS}`}
              >
                취소
              </button>
            )}
            <button type="button" onClick={goConfirm} className={`px-5 py-2.5 ${PRIMARY_BUTTON_CLASS}`}>
              다음
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div>
          {/* 계좌를 잘못 넣으면 남에게 송금되고 되돌릴 수 없다. 저장 직전에 한 번 더 눈으로
              확인시키는 단계가 이 화면에만 있는 이유다. */}
          <p className="text-[13px] leading-relaxed text-text-2">
            {copy.confirmLead} <b className="font-extrabold text-text-1">한 글자라도 다르면
            다른 사람에게 송금되고 되돌릴 수 없어요.</b> 다시 한 번 확인해 주세요.
          </p>

          <dl className="mt-4 border-t border-text-1/20 text-[14px]">
            <div className="flex justify-between gap-3 border-b border-border py-3">
              <dt className="text-text-3">은행</dt>
              <dd className="font-bold text-text-1">{selectedBankName}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-border py-3">
              <dt className="text-text-3">계좌번호</dt>
              <dd className="font-bold tabular-nums text-text-1">{accountNumber}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-border py-3">
              <dt className="text-text-3">예금주</dt>
              <dd className="font-bold text-text-1">{holderName.trim()}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-3 text-[13px] font-bold text-accent">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={busy}
              className={`px-5 py-2.5 ${SECONDARY_BUTTON_CLASS}`}
            >
              고치기
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className={`px-5 py-2.5 ${PRIMARY_BUTTON_CLASS}`}
            >
              {busy ? "등록 중..." : "이 계좌로 등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function Empty() {
    return (
      <div>
        <p className="text-sm font-bold text-text-2">{copy.emptyTitle}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">{copy.emptyDesc}</p>
        <button
          type="button"
          onClick={startEditing}
          className={`mt-4 px-5 py-2.5 ${PRIMARY_BUTTON_CLASS}`}
        >
          {copy.emptyCta}
        </button>
      </div>
    );
  }

  function Registered() {
    if (!account) return null;
    return (
      <div>
        <dl className="border-t border-text-1/20 text-[14px]">
          <div className="flex justify-between gap-3 border-b border-border py-3">
            <dt className="text-text-3">은행</dt>
            <dd className="font-bold text-text-1">{account.bankName}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-border py-3">
            <dt className="text-text-3">계좌번호</dt>
            <dd className="font-bold tabular-nums text-text-1">{account.maskedAccountNumber}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-border py-3">
            <dt className="text-text-3">예금주</dt>
            <dd className="font-bold text-text-1">{account.holderName}</dd>
          </div>
        </dl>

        {/* 보안상 뒤 4자리만 돌려받는다 — "왜 다 안 보이나"를 묻기 전에 먼저 말해 준다. */}
        <p className="mt-2.5 text-[12px] leading-relaxed text-text-3">
          계좌번호는 안전하게 암호화해 보관하고 있어 뒤 4자리만 보여드려요.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={startEditing}
            disabled={busy}
            className={`px-5 py-2.5 ${SECONDARY_BUTTON_CLASS}`}
          >
            계좌 변경
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`px-3 py-2.5 text-sm font-bold text-text-3 transition-colors hover:text-accent disabled:opacity-50 ${FOCUS_RING}`}
          >
            삭제
          </button>
        </div>
      </div>
    );
  }
}
