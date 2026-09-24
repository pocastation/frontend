"use client";

import { useDelayedFlag } from "@/lib/use-delayed-flag";

/**
 * 화면 최상단 2px 진행 막대(#752).
 *
 * <p>정렬·검색·목록 갱신이 이 표시 하나를 함께 쓴다. <b>레이아웃에 참여하지 않는다</b> —
 * 예전에는 스피너가 정렬 칩 행 안에 들어가 칩 전체를 18px 밀었다.
 *
 * <p>{@link useDelayedFlag}를 거치므로 빠른 조회에서는 아예 그려지지 않는다. 호출부는
 * 원래의 `loading`을 그대로 넘기면 된다.
 */
export default function TopProgressBar({ active }: { active: boolean }) {
	const shown = useDelayedFlag(active);
	if (!shown) return null;

	return (
		<div className="progress-track fixed inset-x-0 top-0 z-[400] h-[2px] overflow-hidden" aria-hidden="true">
			<span className="progress-sweep block h-full w-1/3 bg-primary" />
		</div>
	);
}
