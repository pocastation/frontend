// 히어로의 폰 목업. 이미지 없이 CSS만으로 그린다 — 홍보 페이지는 트래픽이 몰릴 수 있어 정적 자산을 늘리지 않는다.
//
// 카드에 적는 정보는 실제 매물 상세 기준이다. 시안 원본의 「현재 최고 제안 42,000원」은 쓰지 않는다 —
// 호가는 비공개가 정책이라(거래 개편 §1.7) 서비스가 보여 주지 않는 정보를 홍보 화면이 약속하면 안 된다.
// 「사진 인증 완료」 배지는 실제 카드에는 없다(인증은 등록 관문이라 공개 매물은 전부 인증됨). 홍보용 강조로만 둔다.
//
// 좌우 포카 카드는 위아래로 천천히 떠다닌다(pocaFloat / pocaFloat2, globals.css). reduced-motion 사용자에게는
// 전역 규칙이 애니메이션을 끄므로 기본 transform(rotate)만 남게 base 클래스에도 회전을 준다.
export default function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-[320px] ${className}`}>
      <div className="absolute -left-1.5 top-[42px] aspect-[5.5/8.5] w-24 rotate-[-9deg] animate-[pocaFloat_6s_ease-in-out_infinite] rounded-lg border border-black/10 bg-[#1f3c88]">
        <span className="absolute bottom-3 left-3 h-1 w-[26px] rounded-sm bg-white/55" />
      </div>
      <div className="absolute -right-1.5 top-[34px] aspect-[5.5/8.5] w-24 rotate-[9deg] animate-[pocaFloat2_7.5s_ease-in-out_infinite] rounded-lg border border-black/10 bg-[#f2a7c0]">
        <span className="absolute bottom-3 left-3 h-1 w-[26px] rounded-sm bg-white/55" />
      </div>

      <div className="absolute left-1/2 top-0 h-[320px] w-[232px] -translate-x-1/2 overflow-hidden rounded-t-[28px] border-[6px] border-b-0 border-[#111118] bg-white">
        <div className="flex justify-between px-3.5 pt-2 font-display text-[10px] font-bold text-[#111118]">
          <span>9:41</span>
          <span className="inline-block h-1.5 w-[22px] rounded-[1px] bg-[#111118]" />
        </div>
        <div className="relative mx-3 mt-2.5 h-[150px] rounded-lg bg-[#2f66d1]">
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-[3px] bg-white px-1.5 py-[3px] text-[9px] font-extrabold text-text-1">
            <span className="h-[5px] w-[5px] rounded-full bg-ok" />
            사진 인증 완료
          </span>
          <div className="absolute left-1/2 top-1/2 h-[92px] w-[62px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/30 bg-[#1d4fb5]">
            <span className="absolute inset-x-1.5 top-[34px] text-center font-display text-[8px] font-extrabold leading-[1.1] text-white/90">
              LOVE DIVE
            </span>
          </div>
        </div>
        <p className="px-3 pt-2.5 text-[12px] font-extrabold text-text-1">IVE LOVE DIVE 포토카드</p>
        <p className="px-3 pt-0.5 text-[9.5px] text-text-3">앨범 봉입 · 상태 A · 제안 12명</p>
        <div className="mx-3 mt-2.5 flex items-end justify-between border-t border-border pt-2">
          <div>
            <p className="text-[8.5px] text-text-3">최소 제안가</p>
            <p className="font-display text-[16px] font-extrabold text-text-1">42,000원</p>
          </div>
          <span className="rounded-[3px] border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] font-extrabold text-text-1">
            마감 2시간 58분
          </span>
        </div>
        <div className="mx-3 mt-2.5 grid h-8 place-items-center rounded-[4px] bg-primary text-[11px] font-bold text-white">
          가격 제안하기
        </div>
      </div>
    </div>
  );
}
