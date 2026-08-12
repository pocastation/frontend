"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INPUT_CLASS } from "@/lib/ui";

// 계정 설정 탭 — 현재는 회원 탈퇴만. 파괴적·비가역 액션이라 "탈퇴"를 직접 입력해야 버튼이 열린다
// (비밀번호 입력은 받지 않는다). 성공하면 서버가 프로필을 가명화하고 세션을 폐기하므로 홈으로 보낸다.
export default function SettingsTab() {
  const router = useRouter();
  const { withdraw } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = confirmText.trim() === "탈퇴";

  async function handleWithdraw() {
    if (!armed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await withdraw();
      router.replace("/?withdrawn=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <section className="rounded-r3 border border-accent/30 bg-surface p-5">
        <h2 className="font-display text-sm font-extrabold text-accent">회원 탈퇴</h2>
        <div className="mt-3 space-y-1.5 text-sm text-text-2">
          <p>탈퇴하면 계정을 다시 사용할 수 없고, 되돌릴 수 없어요.</p>
          <ul className="ml-4 list-disc space-y-1 text-[13px] text-text-3">
            <li>닉네임·이메일 등 개인정보는 파기돼요.</li>
            <li>법령에 따라 입찰·거래 기록은 보관되지만, 누구인지 알 수 없게 처리돼요.</li>
            <li>진행 중인 경매·주문(결제·배송·정산)이 있으면 탈퇴할 수 없어요.</li>
          </ul>
        </div>

        <label htmlFor="withdraw-confirm" className="mt-4 block text-[13px] font-bold text-text-2">
          계속하려면 <span className="text-accent">탈퇴</span>라고 입력해 주세요.
        </label>
        <input
          id="withdraw-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder="탈퇴"
          autoComplete="off"
          className={`mt-1.5 ${INPUT_CLASS}`}
        />
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-accent">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={!armed || isSubmitting}
          className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "처리 중..." : "회원 탈퇴"}
        </button>
      </section>
    </div>
  );
}
