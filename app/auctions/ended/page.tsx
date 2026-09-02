import AuctionBrowser from "@/components/AuctionBrowser";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import type { SortKey } from "@/components/AuctionExplorer";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "거래 완료 — Pocastation" };

// 🔴 이 목록은 **실제로 거래가 성사된 매물만** 담는다(BE #365).
//
// 예전에는 제안 없이 끝난 매물(ENDED_NO_BIDS)과 판매자 미선택 종료(ENDED_NOT_SELECTED)까지
// 함께 보여주고 「종료된 거래」라 불렀다. 이름이 「거래 완료」가 되면서 **거래가 아예 없었던
// 매물까지 완료라고 부르게 되므로** 백엔드에서 목록을 좁혔다.
//
// 판매자가 자기 이력을 잃지는 않는다 — 미성사 건은 마이페이지 「판매 내역」이 보여준다.

// 이 목록은 진행중과 정렬 의미가 달라 전용 옵션을 쓴다 — 기본은 최근 종료순(백엔드 endAt DESC).
// 키는 리터럴로 둔다 — SORT_OPTIONS는 "use client" 모듈 export라 서버 컴포넌트에서 값으로
// 참조하면 런타임에 실제 배열이 아니라 클라이언트 참조 스텁이 넘어온다.
//
// 🔴 가격 정렬(높은/낮은 거래가)을 뺐다(거래 개편 §1.7·§9.4). 종료 목록의 currentPrice는
// 최종 성사가라, 정렬로 노출하면 §9.4가 막기로 한 「개별 거래가 공개」가 뒷문으로 성립한다.
// 최종 성사가 표시 자체도 함께 사라졌다 — 가격 발견은 훗날 SKU 카탈로그 기반 집계로 대체한다.
const ENDED_SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최근 완료순" },
  { key: "popular", label: "제안 많은 순" },
];

async function getEndedAuctions(query: string): Promise<AuctionListResponse | null> {
  const params = new URLSearchParams({ sort: "latest", size: "20" });
  if (query) params.set("q", query);
  try {
    return await apiFetch<AuctionListResponse>(`/api/auctions/ended?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function EndedAuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const auctions = await getEndedAuctions(query);

  return (
    <>
      {/*
        뒤로는 **히스토리 뒤로**다(#513). 하단 5탭이 가리키지 않는 화면이라 진입로가 하나로
        정해져 있지 않다 — 고정 도착지를 두면 들어온 곳과 다른 데로 보낸다(판매자 상세와 같은 판단).
      */}
      <MobilePageHead title="거래 완료" />

      <div className="mx-auto max-w-[1160px] px-[14px] py-5 sm:px-4 sm:py-10">
        <div className="mb-4 sm:mb-7">
          {/* 모바일은 앱바가 제목이다 — 화면 안에서 h1을 반복하지 않는다(알림·스타·판매자와 같다). */}
          <h1 className="hidden font-display text-2xl font-extrabold tracking-tight text-text-1 sm:block">
            거래 완료
          </h1>
          {/* 🔴 문구를 두 번 고쳤다. 「최종 거래가를 확인해보세요」는 §1.7·§9.4로 성사가를 감추면서
              지키지 못하는 약속이 됐고(T40), 「거래 성사·미성사로 종료된 매물」은 목록이 성사분만
              담게 되면서 사실과 달라졌다. 화면이 실제로 하는 일만 적는다.

              모바일에서도 이 문장은 남긴다 — 이 목록이 **성사분만 담는다**는 사실을 말해 주는
              유일한 자리라 지우면 오해가 생긴다. */}
          <p className="text-[12.5px] text-text-3 sm:mt-1.5 sm:text-sm">거래가 성사된 매물을 확인해보세요.</p>
        </div>

        <AuctionBrowser
          key={query}
          endpoint="/api/auctions/ended"
          sortOptions={ENDED_SORT_OPTIONS}
          initialAuctions={auctions?.content ?? []}
          initialTotalElements={auctions?.totalElements ?? 0}
          initialTotalPages={auctions?.totalPages ?? 0}
          initialQuery={query}
          emptyTitle="완료된 거래가 없습니다"
          // 375px 검색칸에서 잘리지 않는 길이로 줄였다. 입력을 두 벌 두면 id가 문서에 둘 생겨
          // 포커스가 보이지 않는 쪽으로 갈 수 있어(#493에서 실제로 겪었다) 한 문구로 통일한다.
          searchPlaceholder="제목·스타·멤버 검색"
        />
      </div>
    </>
  );
}
