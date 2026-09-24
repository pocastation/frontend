"use client";

import { useEffect, useRef, useState } from "react";

/** 이 시간 안에 끝나면 아무것도 보여주지 않는다. */
export const SHOW_AFTER_MS = 200;

/** 한 번 보여줬으면 최소 이만큼은 유지한다. */
export const MIN_VISIBLE_MS = 400;

/**
 * 로딩 표시를 늦게 켜고 늦게 끈다(#752).
 *
 * <p>목록 조회는 실측 47ms다. 그 시간에 표시를 그렸다 지우면 정보가 아니라 **잡음**이 된다 —
 * 사람이 상태 변화로 인지하는 하한이 100ms 근처라, 그보다 짧은 표시는 깜빡임으로만 남는다.
 * 실제로 스피너는 32ms, 목록 흐려짐은 50ms 떠 있었다.
 *
 * <p>그렇다고 표시를 아주 없애면 느린 망에서 눌러도 아무 일이 없는 화면이 된다. 사용자는
 * 눌리지 않았다고 보고 다시 누른다. 그래서 <b>빠르면 없고 느리면 있다</b>로 둔다.
 *
 * <p>최소 노출이 필요한 이유는 반대쪽 끝 때문이다. 201ms에 시작한 표시가 210ms에 사라지면
 * 그것도 깜빡임이다.
 */
export function useDelayedFlag(active: boolean): boolean {
	const [shown, setShown] = useState(false);
	const shownAtRef = useRef(0);

	useEffect(() => {
		if (active) {
			if (shown) return;
			const timer = setTimeout(() => {
				shownAtRef.current = Date.now();
				setShown(true);
			}, SHOW_AFTER_MS);
			return () => clearTimeout(timer);
		}
		if (!shown) return;
		const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
		if (remaining <= 0) {
			setShown(false);
			return;
		}
		const timer = setTimeout(() => setShown(false), remaining);
		return () => clearTimeout(timer);
	}, [active, shown]);

	return shown;
}
