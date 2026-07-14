"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import { loadPostcodeScript } from "@/lib/postcode";
import type { DeliveryAddress } from "@/lib/types";

const MAX_ADDRESSES = 10;

type FormValues = {
  label: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
};

const EMPTY_FORM: FormValues = {
  label: "",
  recipientName: "",
  phone: "",
  postalCode: "",
  address1: "",
  address2: "",
  isDefault: false,
};

// 마이페이지 "배송지 관리" 탭 — 목록·추가/수정·삭제·기본 지정. 주문 플로우(order 도메인)가
// 이 배송지를 스냅샷으로 가져가는 게 최종 용도라, 여기서는 주소록 CRUD만 담당한다.
export default function DeliveryAddressBook() {
  const { fetchWithAuth } = useAuth();

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null=닫힘, "new"=추가, 숫자=해당 id 수정.
  const [editing, setEditing] = useState<"new" | number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchWithAuth<DeliveryAddress[]>("/api/members/me/delivery-addresses");
      setAddresses(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송지를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버 데이터를 동기화한다(마이페이지 loadMyActivity와 동일 패턴).
    void load();
  }, [load]);

  async function handleDelete(address: DeliveryAddress) {
    if (!window.confirm(`'${address.label ?? address.address1}' 배송지를 삭제할까요?`)) return;
    try {
      await fetchWithAuth<void>(`/api/members/me/delivery-addresses/${address.id}`, { method: "DELETE" });
      setAddresses((prev) => prev.filter((a) => a.id !== address.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송지를 삭제하지 못했습니다.");
    }
  }

  // 기본 지정은 PATCH가 전체 필드를 받으므로 기존 값 + isDefault만 바꿔 보낸다.
  async function handleSetDefault(address: DeliveryAddress) {
    try {
      await fetchWithAuth<DeliveryAddress>(`/api/members/me/delivery-addresses/${address.id}`, {
        method: "PATCH",
        body: {
          label: address.label,
          recipientName: address.recipientName,
          phone: address.phone,
          postalCode: address.postalCode,
          address1: address.address1,
          address2: address.address2,
          isDefault: true,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "기본 배송지를 변경하지 못했습니다.");
    }
  }

  if (loading) return <p className="text-sm text-text-3">배송지를 불러오는 중...</p>;

  const editingAddress = typeof editing === "number" ? addresses.find((a) => a.id === editing) : undefined;

  return (
    <div className="max-w-xl">
      {error && (
        <p role="alert" className="mb-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      {editing !== null ? (
        <AddressForm
          key={typeof editing === "number" ? editing : "new"}
          initial={
            editingAddress
              ? {
                  label: editingAddress.label ?? "",
                  recipientName: editingAddress.recipientName,
                  phone: editingAddress.phone,
                  postalCode: editingAddress.postalCode,
                  address1: editingAddress.address1,
                  address2: editingAddress.address2 ?? "",
                  isDefault: editingAddress.isDefault,
                }
              : EMPTY_FORM
          }
          isEdit={typeof editing === "number"}
          isFirst={addresses.length === 0}
          onCancel={() => setEditing(null)}
          onSubmit={async (values) => {
            const body = {
              label: values.label.trim() || null,
              recipientName: values.recipientName.trim(),
              phone: values.phone.trim(),
              postalCode: values.postalCode.trim(),
              address1: values.address1.trim(),
              address2: values.address2.trim() || null,
              isDefault: values.isDefault,
            };
            if (typeof editing === "number") {
              await fetchWithAuth<DeliveryAddress>(`/api/members/me/delivery-addresses/${editing}`, {
                method: "PATCH",
                body,
              });
            } else {
              await fetchWithAuth<DeliveryAddress>("/api/members/me/delivery-addresses", {
                method: "POST",
                body,
              });
            }
            setEditing(null);
            await load();
          }}
        />
      ) : (
        <>
          {addresses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-16 text-center">
              <p className="text-sm font-bold text-text-2">등록된 배송지가 없어요.</p>
              <p className="text-xs text-text-3">낙찰 후 배송받을 주소를 미리 등록해두세요.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-r3 border border-border bg-surface p-4 shadow-card">
                  <div className="flex items-center gap-2">
                    {address.label && (
                      <span className="text-sm font-extrabold text-text-1">{address.label}</span>
                    )}
                    {address.isDefault && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                        기본 배송지
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-text-1">
                    {address.recipientName} <span className="font-normal text-text-3">· {address.phone}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-text-2">
                    ({address.postalCode}) {address.address1}
                    {address.address2 ? ` ${address.address2}` : ""}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address)}
                        className={`px-3 py-1.5 text-xs ${SECONDARY_BUTTON_CLASS}`}
                      >
                        기본으로 지정
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(address.id)}
                      className={`px-3 py-1.5 text-xs ${SECONDARY_BUTTON_CLASS}`}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address)}
                      className={`px-3 py-1.5 text-xs font-bold text-text-3 hover:text-accent ${FOCUS_RING}`}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-text-3">
              {addresses.length}/{MAX_ADDRESSES}개 등록됨
            </p>
            <button
              type="button"
              onClick={() => setEditing("new")}
              disabled={addresses.length >= MAX_ADDRESSES}
              className={`px-4 py-2 ${PRIMARY_BUTTON_CLASS}`}
            >
              배송지 추가
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddressForm({
  initial,
  isEdit,
  isFirst,
  onCancel,
  onSubmit,
}: {
  initial: FormValues;
  isEdit: boolean;
  isFirst: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const labelId = useId();
  const nameId = useId();
  const phoneId = useId();
  const postalId = useId();
  const addr1Id = useId();
  const addr2Id = useId();
  const defaultId = useId();

  const [values, setValues] = useState<FormValues>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeBoxRef = useRef<HTMLDivElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function openPostcode() {
    setError(null);
    try {
      await loadPostcodeScript();
    } catch (err) {
      setError(err instanceof Error ? err.message : "우편번호 서비스를 불러오지 못했습니다.");
      return;
    }
    setPostcodeOpen(true);
    // embed 대상 div가 렌더된 다음 프레임에 마운트한다.
    requestAnimationFrame(() => {
      const box = postcodeBoxRef.current;
      if (!box || !window.daum?.Postcode) return;
      box.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data) => {
          setValues((prev) => ({
            ...prev,
            postalCode: data.zonecode,
            address1: data.roadAddress || data.jibunAddress,
          }));
          setPostcodeOpen(false);
          address2Ref.current?.focus();
        },
        width: "100%",
        height: "100%",
      }).embed(box);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(values.postalCode.trim())) {
      setError("우편번호 찾기로 주소를 선택해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송지를 저장하지 못했습니다.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-r3 border border-border bg-surface p-5 shadow-card">
      <h2 className="font-display text-sm font-extrabold text-text-1">
        {isEdit ? "배송지 수정" : "배송지 추가"}
      </h2>

      <div className="mt-4 flex flex-col gap-3.5">
        <div>
          <label htmlFor={labelId} className="mb-1.5 block text-xs font-bold text-text-2">
            배송지명 <span className="font-normal text-text-3">(선택)</span>
          </label>
          <input
            id={labelId}
            type="text"
            value={values.label}
            onChange={(e) => set("label", e.target.value)}
            maxLength={20}
            placeholder="집, 회사 등"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor={nameId} className="mb-1.5 block text-xs font-bold text-text-2">
              받는 사람
            </label>
            <input
              id={nameId}
              type="text"
              value={values.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
              required
              maxLength={30}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={phoneId} className="mb-1.5 block text-xs font-bold text-text-2">
              연락처
            </label>
            <input
              id={phoneId}
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              required
              placeholder="010-0000-0000"
              pattern="^0\d{1,2}-?\d{3,4}-?\d{4}$"
              title="연락처 형식이 올바르지 않습니다."
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label htmlFor={postalId} className="mb-1.5 block text-xs font-bold text-text-2">
            주소
          </label>
          <div className="flex gap-2">
            <input
              id={postalId}
              type="text"
              value={values.postalCode}
              readOnly
              required
              placeholder="우편번호"
              aria-label="우편번호"
              className={`${INPUT_CLASS} max-w-[120px] bg-surface-2`}
            />
            <button type="button" onClick={openPostcode} className={`shrink-0 px-3.5 ${SECONDARY_BUTTON_CLASS}`}>
              우편번호 찾기
            </button>
          </div>
          {postcodeOpen && (
            <div className="mt-2 overflow-hidden rounded-r2 border border-border">
              <div ref={postcodeBoxRef} className="h-[420px] w-full" />
              <button
                type="button"
                onClick={() => setPostcodeOpen(false)}
                className={`block w-full border-t border-border py-2 text-xs font-bold text-text-3 hover:text-text-1 ${FOCUS_RING}`}
              >
                닫기
              </button>
            </div>
          )}
          <input
            id={addr1Id}
            type="text"
            value={values.address1}
            readOnly
            required
            placeholder="우편번호 찾기로 주소를 선택해주세요"
            aria-label="기본 주소"
            className={`${INPUT_CLASS} mt-2 bg-surface-2`}
          />
          <input
            id={addr2Id}
            ref={address2Ref}
            type="text"
            value={values.address2}
            onChange={(e) => set("address2", e.target.value)}
            maxLength={200}
            placeholder="상세 주소 (동/호수 등)"
            aria-label="상세 주소"
            className={`${INPUT_CLASS} mt-2`}
          />
        </div>

        <label htmlFor={defaultId} className="flex items-center gap-2 text-sm font-semibold text-text-2">
          <input
            id={defaultId}
            type="checkbox"
            checked={isFirst || values.isDefault}
            disabled={isFirst || (isEdit && initial.isDefault)}
            onChange={(e) => set("isDefault", e.target.checked)}
            className={`h-4 w-4 accent-[var(--color-primary)] ${FOCUS_RING}`}
          />
          기본 배송지로 지정
          {isFirst && <span className="text-xs font-normal text-text-3">(첫 배송지는 자동으로 기본이 돼요)</span>}
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-accent">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={isSubmitting} className={`flex-1 py-2.5 ${PRIMARY_BUTTON_CLASS}`}>
          {isSubmitting ? "저장 중..." : isEdit ? "수정하기" : "등록하기"}
        </button>
        <button type="button" onClick={onCancel} className={`px-5 py-2.5 ${SECONDARY_BUTTON_CLASS}`}>
          취소
        </button>
      </div>
    </form>
  );
}
