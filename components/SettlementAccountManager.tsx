"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { BankOption, SettlementAccount } from "@/lib/types";

const PATH = "/api/members/me/settlement-account";

// 라벨보다 입력칸이 커야 눈이 입력할 곳으로 먼저 간다(CLAUDE.md 「디자인」).
const FIELD =
  `h-12 w-full rounded-r2 border border-border px-3.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`;

type Step = "view" | "form" | "confirm";

export default function SettlementAccountManager() {
  const { fetchWithAuth } = useAuth();

  const [account, setAccount] = useState<SettlementAccount | null>(null);
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
      fetchWithAuth<SettlementAccount>(PATH).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
      apiFetch<BankOption[]>("/api/settlement-accounts/banks"),
    ])
      .then(([saved, bankList]) => {
        if (!alive) return;
        setAccount(saved);
        setBanks(bankList);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setMessage({
          type: "err",
          text: err instanceof ApiError ? err.message : "정산계좌를 불러오지 못했어요.",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchWithAuth, reloadKey]);

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
      await fetchWithAuth<SettlementAccount>(PATH, {
        method: "PUT",
        body: { bank, accountNumber, holderName: holderName.trim() },
      });
      setStep("view");
      setMessage({ type: "ok", text: "정산계좌를 등록했어요." });
      setReloadKey((k) => k + 1);
    } catch (err) {
      // 키 미설정(503)은 사용자 잘못이 아니다 — 입력을 고치라고 하면 계속 헛수고한다.
      if (err instanceof ApiError && err.errorCode === "FIELD_ENCRYPTION_UNAVAILABLE") {
        setError("지금은 정산계좌를 등록할 수 없어요. 잠시 후 다시 시도해 주세요.");
      } else {
        setError(err instanceof ApiError ? err.message : "등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      setStep("form");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("등록된 정산계좌를 삭제할까요? 판매 대금을 받으려면 다시 등록해야 해요.")) {
      return;
    }
    setBusy(true);
    try {
      await fetchWithAuth<void>(PATH, { method: "DELETE" });
      setAccount(null);
      setMessage({ type: "ok", text: "정산계좌를 삭제했어요." });
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
            이 계좌로 판매 대금을 보내드려요. <b className="font-extrabold text-text-1">한 글자라도 다르면
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
        <p className="text-sm font-bold text-text-2">등록된 정산계좌가 없어요.</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
          판매 대금은 구매확정 후 이 계좌로 들어와요. 등록해 두지 않으면 낙찰돼도 대금을 보내드릴 수 없어요.
        </p>
        <button
          type="button"
          onClick={startEditing}
          className={`mt-4 px-5 py-2.5 ${PRIMARY_BUTTON_CLASS}`}
        >
          정산계좌 등록
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
