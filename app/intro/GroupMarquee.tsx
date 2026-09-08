// 「사전 신청자가 찾는 그룹」 띠. 목록은 정적이다 — 사전 신청 데이터를 집계하는 API는 없고, 시안 확정 시
// 홍보 문구로 두기로 했다(2026-09-08). 실제 집계로 바꾸려면 백엔드에 상위 N개 집계 API가 필요하다.
//
// 칩을 두 벌 이어 붙이고 트랙을 한 벌 폭(-50%)만큼 옮기면 되감기 없이 이어진다(pocaMarquee, globals.css).
// 두 번째 벌은 화면용이라 보조기기에는 숨긴다. reduced-motion에서는 전역 규칙이 애니메이션을 끈다.
const GROUPS = [
  "NCT DREAM",
  "세븐틴",
  "뉴진스",
  "에스파",
  "스트레이 키즈",
  "BTS",
  "르세라핌",
  "IVE",
  "TWS",
  "엔하이픈",
];

function Chips({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0">
      {GROUPS.map((g) => (
        <li
          key={g}
          className="mr-2 inline-flex h-7 items-center rounded-[3px] border border-border-2 bg-white px-2.5 text-[12px] font-bold text-text-1"
        >
          {g}
        </li>
      ))}
    </ul>
  );
}

export default function GroupMarquee() {
  return (
    <section aria-label="사전 신청자가 찾는 그룹" className="mx-auto max-w-[1080px] pt-8 sm:pt-10">
      <p className="px-5 text-[11px] font-extrabold tracking-[0.08em] text-text-3">사전 신청자가 찾는 그룹</p>
      <div className="mt-3 overflow-hidden pl-5 whitespace-nowrap">
        <div className="flex w-max animate-[pocaMarquee_26s_linear_infinite]">
          <Chips />
          <Chips hidden />
        </div>
      </div>
    </section>
  );
}
