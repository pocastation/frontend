"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStandalonePwa } from "@/lib/standalone-pwa";
import { useWebPush } from "@/lib/use-web-push";
import { PUSH_SETTINGS_PATH } from "@/lib/web-push";
import styles from "./push-settings.module.css";

const groups = [
  {
    title: "교환",
    items: [
      ["EXCHANGE_REQUEST", "교환 신청", "내 교환글에 새 신청이 들어오면 알려요."],
      ["EXCHANGE_MATCH", "교환 확정", "내가 보낸 신청이 수락되면 알려요."],
      ["EXCHANGE_CHAT", "교환 채팅", "상대가 새 메시지를 보내면 알려요."],
      ["EXCHANGE_COMPLETION", "교환 완료·이의", "상대의 완료 확인과 이의 제기를 알려요."],
      ["EXCHANGE_CLOSURE", "교환 신청 마감", "다른 신청이 수락되거나 행사가 끝나면 알려요."],
      ["EXCHANGE_MODERATION", "교환글 조치", "교환글 내림과 신청 무효를 알려요."],
    ],
  },
  {
    title: "판매와 구매",
    items: [
      ["NEW_OFFER", "새 가격 제안", "내 판매글에 새 제안이 들어오면 알려요."],
      ["LISTING_REVIEW", "판매글 승인·보완·취소", "게시 승인, 보완 요청, 관리자 취소를 알려요."],
      ["LISTING_CLOSURE", "판매 종료 안내", "종료 예정과 거래 없이 종료된 결과를 알려요."],
      ["OFFER_RESULT", "내가 보낸 제안 결과", "내 제안의 선택·미선택 결과를 알려요."],
      ["LISTING_CHANGE", "제안한 판매글 변경", "기간 연장, 판매글 철회·내림을 알려요."],
      ["PAYMENT", "결제·주문 취소", "결제 결과, 주문 취소와 판매 재개를 알려요."],
      ["SHIPPING", "배송지·배송 진행", "배송지 입력 요청과 배송 진행을 알려요."],
      ["CONFIRMATION", "구매확정·정산", "구매확정과 정산 완료를 알려요."],
      ["REFUND", "환불", "환불 완료와 거래 취소를 알려요."],
      ["RETURN_DISPUTE", "반품·분쟁", "반품 진행과 분쟁 처리 결과를 알려요."],
    ],
  },
  {
    title: "운영 소식",
    items: [["CAMPAIGN", "운영·이벤트 알림", "이벤트 소식은 마케팅 수신에 동의한 경우에만 받아요."]],
  },
  {
    title: "고객문의",
    items: [["INQUIRY", "1:1 문의 답변", "내가 남긴 문의에 답변이 등록되면 알려요."]],
  },
] as const;

export default function PushSettingsPage() {
  const standalone = useStandalonePwa();
  const { member, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (standalone === false) router.replace("/mypage");
    else if (standalone && !isLoading && !member) {
      router.replace(`/login?redirect=${encodeURIComponent(PUSH_SETTINGS_PATH)}`);
    }
  }, [standalone, isLoading, member, router]);

  if (!standalone || isLoading || !member) return null;
  return <Settings key={member.id} memberId={member.id} />;
}

function Settings({ memberId }: { memberId: string }) {
  const { state, active, optedIn, saving, error, canEnable, unavailable, connectDevice, toggleMaster, toggleCategory } =
    useWebPush(true, memberId);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/mypage" aria-label="마이페이지로 돌아가기" className={styles.back}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1>푸시 알림</h1>
      </header>
      <div className={styles.master}>
        <span id="push-master-label">푸시 알림 받기</span>
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          aria-labelledby="push-master-label"
          aria-controls="push-categories"
          className={styles.switch}
          disabled={saving || !state}
          onClick={() => void toggleMaster()}
        />
      </div>
      {optedIn && !active && canEnable && (
        <button type="button" className={styles.feedback} disabled={saving} onClick={() => void connectDevice()}>
          {state?.permission === "default" ? "기기 알림 허용" : "기기 알림 연결"}
        </button>
      )}
      <div id="push-categories" aria-busy={!state && !error || saving}>
        {groups.map(({ title, items }, index) => (
          <section className={styles.group} key={title} aria-labelledby={`push-group-${index}`}>
            <h2 id={`push-group-${index}`}>{title}</h2>
            {items.map(([key, label, description]) => (
              <div className={styles.row} data-muted={!active} key={key}>
                <div className={styles.copy}>
                  <span id={`push-${key}`} className={styles.label}>{label}</span>
                  <p id={`push-${key}-description`} className={styles.description}>{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby={`push-${key}`}
                  aria-describedby={`push-${key}-description`}
                  aria-checked={state?.settings.categories.includes(key) ?? true}
                  className={styles.switch}
                  disabled={!active || saving}
                  onClick={() => void toggleCategory(key)}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
      {(error || unavailable) && <p role={error ? "alert" : "status"} className={styles.feedback}>{error || unavailable}</p>}
    </div>
  );
}
