"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadPostcodeScript } from "@/lib/postcode";
import { formatPhoneInput } from "@/lib/phone";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { DeliveryAddress } from "@/lib/types";

// 낙찰 즉시 배송지 입력 팝업(§13 "배송지 자동채움"과 연결) — 기본배송지가 없어 자동 확정되지
// 못한 주문에 저장된 배송지가 있으면 선택만으로, 없으면 새 배송지 입력으로 즉시 확정을 유도한다.
// 강제 모달이 아니다 — 확정 전까지는(§12.2 24시간 유예) 닫고 마이페이지에서 나중에 다시 열 수 있다.
export default function DeliveryAddressModal({
  auctionId,
  auctionTitle,
  onClose,
  onSaved,
}: {
  auctionId: number;
  auctionTitle: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [addresses, setAddresses] = useState<DeliveryAddress[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 배송지 입력 필드(저장된 배송지가 없거나 "새 배송지 입력"을 골랐을 때만 쓰인다).
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  // 새 주소를 주소록에도 남길지. 기본 켬 — 대부분은 다음에도 같은 곳으로 받는다.
  const [saveToBook, setSaveToBook] = useState(true);
  const postcodeBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchWithAuth<DeliveryAddress[]>("/api/members/me/delivery-addresses");
        if (cancelled) return;
        setAddresses(list);
        // 저장된 배송지가 있으면 기본(없으면 최근순 첫 번째)을 선결 지정, 없으면 곧바로 새 입력 폼.
        setSelectedId(list.length > 0 ? (list.find((a) => a.isDefault)?.id ?? list[0].id) : "new");
      } catch {
        if (!cancelled) {
          setAddresses([]);
          setSelectedId("new");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 조회.
  }, []);

  async function openPostcode() {
    setError(null);
    try {
      await loadPostcodeScript();
      setPostcodeOpen(true);
      requestAnimationFrame(() => {
        const box = postcodeBoxRef.current;
        if (!box || !window.daum?.Postcode) return;
        box.innerHTML = "";
        new window.daum.Postcode({
          oncomplete: (data) => {
            setPostalCode(data.zonecode);
            setAddress1(data.roadAddress || data.jibunAddress);
            setPostcodeOpen(false);
          },
          width: "100%",
          height: "100%",
        }).embed(box);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "우편번호 서비스를 불러오지 못했습니다.");
    }
  }

  async function submit() {
    if (saving) return;
    setError(null);

    let body: { recipientName: string; phone: string; postalCode: string; address1: string; address2: string };
    if (selectedId !== "new" && addresses) {
      const picked = addresses.find((a) => a.id === selectedId);
      if (!picked) {
        setError("배송지를 다시 선택해 주세요.");
        return;
      }
      body = {
        recipientName: picked.recipientName,
        phone: picked.phone,
        postalCode: picked.postalCode,
        address1: picked.address1,
        address2: picked.address2 ?? "",
      };
    } else {
      if (!recipientName.trim() || !postalCode || !address1.trim()) {
        setError("우편번호 찾기로 주소를 선택하고 받는 분·연락처를 입력해 주세요.");
        return;
      }
      body = {
        recipientName: recipientName.trim(),
        phone,
        postalCode,
        address1: address1.trim(),
        address2: address2.trim(),
      };
    }

    setSaving(true);
    try {
      await fetchWithAuth<void>(`/api/members/me/orders/${auctionId}/delivery-address`, {
        method: "POST",
        body,
      });
      // 주문 배송지는 그 주문에 박제되는 스냅샷이라(발송 후 주소가 바뀌면 안 된다) 주소록에는
      // 아무것도 남지 않는다. 그래서 여기서 새로 입력한 주소는 주소록에도 넣어준다 —
      // 안 그러면 "입력했는데 배송지 탭에 없다"가 되고, 다음 낙찰 때 또 처음부터 입력해야 한다.
      // 첫 주소면 서버가 자동으로 기본 배송지로 잡아줘서 그다음부터는 자동 확정된다.
      if (selectedId === "new" && saveToBook) {
        try {
          await fetchWithAuth<unknown>("/api/members/me/delivery-addresses", {
            method: "POST",
            body: { ...body, label: "기본 배송지", isDefault: (addresses?.length ?? 0) === 0 },
          });
        } catch {
          // 주소록 저장이 실패해도 주문 배송지는 이미 확정됐다 — 거래를 막지 않는다.
          // 사용자는 나중에 마이페이지에서 직접 등록할 수 있다.
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-r3 border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="배송지 입력"
      >
        <p className="text-sm font-bold text-text-1">배송지를 입력해 주세요</p>
        <p className="mt-1 text-xs text-text-3">
          <b className="font-bold text-text-2">{auctionTitle}</b> 상품을 받을 주소예요. 판매자가 이 정보로 발송해요.
        </p>

        {addresses === null ? (
          <p className="mt-4 text-xs text-text-3">불러오는 중...</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-r2 border p-3 text-xs transition-colors ${
                  selectedId === a.id ? "border-primary bg-primary-soft/30" : "border-border-2 hover:border-text-3"
                }`}
              >
                <input
                  type="radio"
                  name="delivery-address"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  checked={selectedId === a.id}
                  onChange={() => setSelectedId(a.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-bold text-text-1">
                    {a.label && <span>{a.label}</span>}
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        기본
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-text-2">
                    {a.recipientName} · {a.phone}
                  </span>
                  <span className="mt-0.5 block text-text-3">
                    ({a.postalCode}) {a.address1} {a.address2 ?? ""}
                  </span>
                </span>
              </label>
            ))}

            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-r2 border border-dashed p-3 text-xs font-bold transition-colors ${
                selectedId === "new" ? "border-primary bg-primary-soft/30 text-primary" : "border-border-2 text-text-2 hover:border-text-3"
              }`}
            >
              <input
                type="radio"
                name="delivery-address"
                className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                checked={selectedId === "new"}
                onChange={() => setSelectedId("new")}
              />
              새 배송지 입력
            </label>

            {selectedId === "new" && (
              <div className="mt-1 flex flex-col gap-2 rounded-r2 border border-border bg-surface-2/40 p-3">
                <div className="flex gap-2">
                  <input
                    className={`${INPUT_CLASS} flex-1`}
                    placeholder="받는 분"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                  <input
                    className={`${INPUT_CLASS} flex-1`}
                    placeholder="연락처 (010-0000-0000)"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  />
                </div>
                <div className="flex gap-2">
                  <input className={`${INPUT_CLASS} w-28`} placeholder="우편번호" value={postalCode} readOnly />
                  <button
                    type="button"
                    onClick={openPostcode}
                    className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 text-xs font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
                  >
                    우편번호 찾기
                  </button>
                </div>
                {postcodeOpen && (
                  <div ref={postcodeBoxRef} className="h-72 w-full overflow-hidden rounded-r2 border border-border" />
                )}
                <input className={INPUT_CLASS} placeholder="기본 주소" value={address1} readOnly />
                <input
                  className={INPUT_CLASS}
                  placeholder="상세 주소 (동·호수 등)"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                />
                <label className="flex items-center gap-2 text-[12.5px] text-text-2">
                  <input
                    type="checkbox"
                    checked={saveToBook}
                    onChange={(e) => setSaveToBook(e.target.checked)}
                    className={`h-4 w-4 accent-[var(--color-primary)] ${FOCUS_RING}`}
                  />
                  이 주소를 배송지로 저장 — 다음 낙찰부터 자동으로 확정돼요
                </label>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-accent">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={saving || addresses === null}
            className={`flex-1 py-2.5 disabled:opacity-50 ${PRIMARY_BUTTON_CLASS}`}
          >
            {saving ? "저장 중..." : "이 배송지로 확정"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`px-5 py-2.5 disabled:opacity-50 ${SECONDARY_BUTTON_CLASS}`}
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
