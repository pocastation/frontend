import type { Metadata } from "next";
import PaymentClient from "./PaymentClient";

// 결제 페이지(#333) — 낙찰·즉시구매 후 구매자가 실제로 돈을 내는 자리.
// 지금까지 이 화면이 없었다. 결제는 전부 서버가 카드 빌링키로 자동 캡처했고, A안(가상계좌·
// 계좌이체)으로 바뀌면서 "구매자가 결제창을 여는 지점"이 처음 생긴다.
//
// 주문 식별은 auctionId로 한다 — 경매당 활성 주문이 1건이라 서버 API도 그 규약을 쓴다.
export const metadata: Metadata = {
  title: "결제",
  // 개인 주문 화면이라 검색엔진에 남을 이유가 없다.
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const { auctionId } = await params;
  return <PaymentClient auctionId={Number(auctionId)} />;
}
