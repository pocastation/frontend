"use client";

import { FOCUS_RING } from "@/lib/ui";

// 공용 on/off 스위치. 컨테이너 h-6 w-11(24×44) · 노브 h-5 w-5(20) · 양쪽 여백 px-0.5(2px).
//
// 노브 위치를 absolute+left나 translate로 잡지 않고 flex 정렬(justify-start/end)로 잡는다(#117).
// 이 프로젝트 설정에서 노브에 준 inline left·transform이 실제 레이아웃(offsetLeft)에 반영되지 않아
// (OFF에서 ON 위치에 남거나 그 반대) 노브가 어긋났다. flex는 레이아웃 자체를 바꿔 위치가 확실히
// 반영된다(코드베이스 전반에서 검증된 방식). 노브는 flex 아이템이라 컨테이너 안을 벗어나지 않는다.
export default function ToggleSwitch({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-60 ${FOCUS_RING} ${
        checked ? "justify-end bg-primary" : "justify-start bg-border-2"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" aria-hidden="true" />
    </button>
  );
}
