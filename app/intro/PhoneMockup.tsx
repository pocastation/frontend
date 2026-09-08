import Image from "next/image";
import pocaLeft from "../../public/intro/intro-poca-left.png";
import pocaRight from "../../public/intro/intro-poca-right.png";
import phoneScreen from "../../public/intro/intro-phone-screen.png";

// 히어로의 폰 목업. 사전신청 랜딩 파일의 구조·치수를 그대로 옮겼다 — 프레임 218px(딥스페이스, 패딩 8·radius 30),
// 화면 424px, 좌우 포카 사진 96/90px. 사진 3장은 파일에 들어 있던 것을 public/intro로 뽑아 next/image로 낸다.
//
// 카드에 적는 정보는 실제 매물 상세 기준이다. 파일의 「현재 최고 제안 42,000원」은 쓰지 않는다 —
// 호가는 비공개가 정책이라(거래 개편 §1.7) 서비스가 보여 주지 않는 정보를 홍보 화면이 약속하면 안 된다.
// 「사진 인증 완료」 배지는 실제 카드에는 없다(인증은 등록 관문이라 공개 매물은 전부 인증됨). 홍보용 강조로만 둔다.
//
// 좌우 포카는 위아래로 천천히 떠다닌다(pocaFloat / pocaFloat2, globals.css). reduced-motion 사용자에게는
// 전역 규칙이 애니메이션을 끄므로 정지 상태에서도 기울어져 보이게 base 클래스에도 같은 회전을 준다.
export default function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto h-[470px] w-full max-w-[340px] ${className}`}>
      <Image
        src={pocaLeft}
        alt=""
        width={96}
        sizes="96px"
        priority
        className="absolute left-0 top-[62px] w-24 rotate-[-7deg] animate-[pocaFloat_6s_ease-in-out_infinite]"
      />
      <Image
        src={pocaRight}
        alt=""
        width={90}
        sizes="90px"
        priority
        className="absolute right-[2px] top-10 w-[90px] rotate-[8deg] animate-[pocaFloat2_7.5s_ease-in-out_infinite]"
      />

      <div className="absolute left-1/2 top-0 w-[218px] -translate-x-1/2 rounded-[30px] bg-deepspace p-2">
        <div className="flex min-h-[424px] flex-col overflow-hidden rounded-[23px] bg-white">
          <div className="flex items-center justify-between px-3.5 pb-1.5 pt-[9px] font-display text-[10px] font-bold text-text-1">
            <span>9:41</span>
            <span aria-hidden="true" className="tracking-[0.08em] text-text-3">
              ▮▮▮
            </span>
          </div>

          <div className="px-3">
            <div className="relative flex h-[208px] items-center justify-center overflow-hidden rounded-[10px] bg-surface-2">
              <Image src={phoneScreen} alt="포카 상품 사진" width={112} sizes="112px" priority className="block w-[112px]" />
              <span className="absolute left-2 top-2 inline-flex items-center gap-[5px] rounded-[4px] bg-[#111118]/80 px-2 py-1 text-[9.5px] font-bold text-white">
                <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-star" />
                사진 인증 완료
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-[11px]">
            <p className="text-[11.5px] font-bold leading-[1.45] text-text-1">IVE LOVE DIVE 포토카드</p>
            <p className="mt-[3px] text-[9.5px] text-text-3">앨범 봉입 · 상태 A · 제안 12명</p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <div>
                <p className="text-[9px] font-bold text-text-3">최소 제안가</p>
                <p className="mt-0.5 font-display text-[20px] font-extrabold leading-[1.3] tracking-[-0.02em] text-text-1 tabular-nums">
                  42,000<span className="font-sans text-[11px] font-bold">원</span>
                </p>
              </div>
              <span className="rounded-[4px] border border-border bg-surface-2 px-[7px] py-1 text-[9.5px] font-bold text-text-1">
                마감 2시간 58분
              </span>
            </div>
            <div className="mt-[11px] flex h-[34px] items-center justify-center rounded-[4px] bg-primary text-[11.5px] font-bold text-white">
              가격 제안하기
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
