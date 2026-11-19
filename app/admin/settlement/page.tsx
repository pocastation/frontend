"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";

type Payment = {
  orderId: number; title: string; paidAt: string; sellerName: string; sellerId: string;
  chargeAmount: number; expectedAmount: number;
  phase: { status: "대기" | "보류" | "완료" | null; reason: string };
};
type Seller = {
  sellerId: string; sellerName: string; paymentCount: number;
  expectedAmount: number; heldAmount: number; settledAmount: number;
};
type Column<T> = { label: string; cell: (row: T) => ReactNode; numeric?: boolean };
type Rows<T> = { content: T[]; hasNext: boolean };

const base = "/api/admin/payments";
const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short",
});
const button = `rounded-control border border-border-2 px-4 py-2 text-body-s font-bold disabled:opacity-50 ${FOCUS_RING}`;

function sellerIdentity(row: Seller | Payment) {
  return <><strong>{row.sellerName}</strong><small className="block break-all text-caption text-text-3">{row.sellerId}</small></>;
}

const payments: Column<Payment>[] = [
  { label: "주문 · 상품", cell: p => <><small className="block text-label text-text-3">#{p.orderId}</small>{p.title}</> },
  { label: "결제 시각 (KST)", cell: p => date.format(new Date(p.paidAt)) },
  { label: "판매자", cell: sellerIdentity },
  { label: "결제액", cell: p => money.format(p.chargeAmount), numeric: true },
  { label: "정산 상태", cell: p => <>
    <strong className={p.phase.status === "보류" ? "text-danger" : undefined}>{p.phase.status ?? "대상 외"}</strong>
    <small className="block text-label text-text-3">{p.phase.reason}</small>
  </> },
  { label: "정산 예정액", cell: p => money.format(p.expectedAmount), numeric: true },
];
const sellers: Column<Seller>[] = [
  { label: "판매자", cell: sellerIdentity },
  { label: "결제 건수", cell: s => s.paymentCount.toLocaleString("ko-KR"), numeric: true },
  { label: "정산 예정액", cell: s => <strong>{money.format(s.expectedAmount)}</strong>, numeric: true },
  { label: "보류액", cell: s => money.format(s.heldAmount), numeric: true },
  { label: "정산 완료액", cell: s => money.format(s.settledAmount), numeric: true },
];

function ReportTable<T>({ endpoint, columns, rowKey, title }: {
  endpoint: string; columns: Column<T>[]; rowKey: (row: T) => string | number; title: string;
}) {
  const { fetchWithAuth } = useAuth();
  const [page, setPage] = useState(0);
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<Rows<T> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetchWithAuth<Rows<T>>(`${endpoint}?page=${page}&size=20`).then(data => {
      if (active) setResult(data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [fetchWithAuth, endpoint, page, attempt]);

  function changePage(next: number) {
    setResult(null);
    setError(false);
    setPage(next);
  }
  if (error) return <div className="py-row" role="alert">
    {title} 조회에 실패했습니다. <button className={button} onClick={() => {
      setError(false); setResult(null); retry(attempt + 1);
    }}>다시 조회</button>
  </div>;
  if (!result) return <p role="status" className="py-row text-body text-text-3">조회 중…</p>;
  return <>
    {result.content.length ? <div className="admin-table-wrap overflow-x-auto">
      <table aria-label={title} className="admin-table w-full border-collapse text-body-s">
        <thead className="border-b border-border bg-surface-2 text-label text-text-2"><tr>
          {columns.map(c => <th key={c.label} scope="col" className={`px-3 py-3 ${c.numeric ? "text-right" : "text-left"}`}>{c.label}</th>)}
        </tr></thead>
        <tbody>{result.content.map(row => <tr key={rowKey(row)} className="border-b border-border">
          {columns.map(c => <td key={c.label} data-label={c.label}
            className={`px-3 py-row align-top ${c.numeric ? "tabular-nums lg:text-right" : ""}`}>{c.cell(row)}</td>)}
        </tr>)}</tbody>
      </table>
    </div> : <p className="py-empty text-center text-body text-text-3">조회할 내역이 없습니다.</p>}
    {(page > 0 || result.hasNext) && <nav aria-label={title + " 페이지"} className="mt-row flex items-center justify-end gap-3">
      <button className={button} disabled={!page} onClick={() => changePage(page - 1)}>이전</button>
      <span className="text-body-s">{page + 1}페이지</span>
      <button className={button} disabled={!result.hasNext} onClick={() => changePage(page + 1)}>다음</button>
    </nav>}
  </>;
}

export default function SettlementPage() {
  const { fetchBlobWithAuth } = useAuth();
  const [view, setView] = useState<"결제 목록" | "판매자별 정산">("결제 목록");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function download() {
    setBusy(true);
    setError(false);
    try {
      const blob = await fetchBlobWithAuth(base + "/export");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "결제·정산.xlsx";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return <section>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-title-l font-extrabold">결제·정산</h1>
      <button className={button} disabled={busy} onClick={download}>{busy ? "파일 준비 중…" : "전체 엑셀 다운로드"}</button>
    </header>
    {error && <p role="alert" className="mt-tight text-body-s text-danger">엑셀을 내려받지 못했습니다. 다시 시도해 주세요.</p>}
    <div className="mt-group flex gap-5 border-b border-border" role="group" aria-label="조회 항목">
      {(["결제 목록", "판매자별 정산"] as const).map(v => <button key={v} aria-pressed={view === v}
        onClick={() => setView(v)} className={`border-b-2 pb-3 text-body font-bold ${FOCUS_RING} ${view === v ? "border-primary text-primary" : "border-transparent text-text-3"}`}>{v}</button>)}
    </div>
    <p className="my-row text-body-s text-text-2">정산 예정액은 구매확정 후 정산 대기 중인 금액입니다. 반품·분쟁 및 환불 처리 중인 금액은 보류액으로 집계합니다.</p>
    {view === "결제 목록"
      ? <ReportTable key="payments" title={view} endpoint={base} columns={payments} rowKey={p => p.orderId} />
      : <ReportTable key="sellers" title={view} endpoint={base + "/sellers"} columns={sellers} rowKey={s => s.sellerId} />}
  </section>;
}
