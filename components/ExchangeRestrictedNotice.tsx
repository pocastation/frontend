import { dateTimeLabel } from "@/lib/exchange-labels";
import type { MyExchangeRestriction } from "@/lib/types";

/**
 * 교환 제한 중일 때 등록·신청 폼 대신 보여 주는 안내(#824, backend#612).
 *
 * <p>행사 기간이 지난 교환글 화면(`exchangeWindow`)과 같은 자리·같은 모양으로 둔다. 폼을 못 쓰는 이유가
 * 다를 뿐 사용자가 할 수 있는 일이 없다는 점은 같다.
 */
export default function ExchangeRestrictedNotice({ restriction }: { restriction: MyExchangeRestriction }) {
  return (
    <div className="px-gutter py-empty text-center">
      <p className="text-body-l font-extrabold text-text-1">지금은 교환을 이용할 수 없어요</p>
      <p className="mt-tight text-body-s text-text-2">
        최근 {restriction.windowDays}일 동안 노쇼가 {restriction.noShowCount}번 기록됐어요.
        <br />
        {restriction.endsAt ? (
          <>
            <span className="font-bold text-text-1">{dateTimeLabel(restriction.endsAt)}</span>부터 다시 교환글을 올리고
            신청할 수 있어요.
          </>
        ) : (
          "제한이 풀리면 다시 교환글을 올리고 신청할 수 있어요."
        )}
      </p>
    </div>
  );
}
