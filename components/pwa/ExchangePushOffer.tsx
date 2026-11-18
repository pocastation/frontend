"use client";

import { useState } from "react";
import { canShowIosInstallGuide, IOS_INSTALL_GUIDE_EVENT, useStandalonePwa } from "@/lib/standalone-pwa";
import { FOCUS_RING } from "@/lib/ui";
import { useWebPush } from "@/lib/use-web-push";
import { dismissExchangePushOffer, hasExchangePushOffer, supportsWebPush } from "@/lib/web-push";

export default function ExchangePushOffer({ memberId, requestId }: { memberId: string; requestId: number }) {
  const standalone = useStandalonePwa();
  const [visible, setVisible] = useState(() => hasExchangePushOffer(requestId));
  if (!visible || standalone === null) return null;

  function dismiss() {
    dismissExchangePushOffer();
    setVisible(false);
  }

  if (standalone && supportsWebPush()) return <EnableExchangePush memberId={memberId} dismiss={dismiss} />;
  if (!standalone && canShowIosInstallGuide()) {
    return (
      <Offer
        action="홈 화면 설치 안내"
        description="아이폰 홈 화면에 포카스테이션을 추가하면 교환 결과를 휴대폰 알림으로 받을 수 있어요."
        dismiss={dismiss}
        onClick={() => window.dispatchEvent(new Event(IOS_INSTALL_GUIDE_EVENT))}
      />
    );
  }
  return null;
}

function EnableExchangePush({ memberId, dismiss }: { memberId: string; dismiss: () => void }) {
  const { state, canEnable, error, saving, toggleMaster } = useWebPush(true, memberId);
  const [activated, setActivated] = useState(false);

  if (activated) return <p role="status" className="text-body-s font-semibold text-primary">교환 푸시 알림을 켰어요.</p>;
  if (!state || state.settings.configured || (!canEnable && !error)) return null;

  async function enable() {
    const categories = state?.settings.categories.filter((key) => key.startsWith("EXCHANGE_"));
    if (await toggleMaster(categories)) {
      dismissExchangePushOffer();
      setActivated(true);
    }
  }

  return (
    <Offer
      action="교환 알림 켜기"
      description="신청이 수락되거나 새 메시지가 오면 휴대폰으로 알려드려요."
      dismiss={dismiss}
      disabled={saving || !canEnable}
      error={error}
      onClick={() => void enable()}
    />
  );
}

function Offer({ action, description, dismiss, disabled, error, onClick }: {
  action: string;
  description: string;
  dismiss: () => void;
  disabled?: boolean;
  error?: string;
  onClick: () => void;
}) {
  return (
    <div className="mb-2 rounded-card border border-border bg-white p-3">
      <p className="text-body-s text-text-2">{description}</p>
      {error && <p role="alert" className="mt-1 text-label text-danger">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={disabled} className={`min-h-10 rounded-control text-body-s font-bold text-primary disabled:opacity-50 ${FOCUS_RING}`} onClick={onClick}>
          {action}
        </button>
        <button type="button" className={`min-h-10 rounded-control text-body-s font-semibold text-text-2 ${FOCUS_RING}`} onClick={dismiss}>
          나중에
        </button>
      </div>
    </div>
  );
}
