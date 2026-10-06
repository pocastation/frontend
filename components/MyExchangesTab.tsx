"use client";

import { useCallback, useEffect, useState } from "react";
import NavLink from "@/components/NavLink";
import StatusBadge from "@/components/StatusBadge";
import { mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { weekdayKo } from "@/lib/event-dates";
import { EXCHANGE_REQUEST_STATUS_TEXT, EXCHANGE_STATUS_TEXT, tradeLine } from "@/lib/exchange-labels";
import type { ExchangeItemView, MyExchangePage, MyExchangePost, MyExchangeRequest } from "@/lib/types";
import { FOCUS_RING, LABEL_STRONG } from "@/lib/ui";

/**
 * 마이 「교환 내역」(#784). 내가 쓴 교환글과 내가 보낸 신청을 모아 본다. 예전에는 행사 피드를 다시
 * 찾아가야 했다.
 *
 * <p>두 목록을 처음에 함께 읽는다. 위 탭(내 교환글 / 보낸 신청)의 건수가 둘 다 처음부터 보여야 해서다.
 * 탭 전환은 부모(마이페이지)의 `FilterChips`가 맡고 이 컴포넌트는 고른 목록만 그린다.
 */
export type ExchangeListMode = "posts" | "requests";

const PAGE_SIZE = 20;

type ListState<T> = { items: T[]; total: number; page: number; totalPages: number };
const EMPTY = { items: [], total: 0, page: 0, totalPages: 0 };

export default function MyExchangesTab({
  mode,
  onCounts,
}: {
  mode: ExchangeListMode;
  onCounts?: (counts: { posts: number; requests: number }) => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [posts, setPosts] = useState<ListState<MyExchangePost>>(EMPTY);
  const [requests, setRequests] = useState<ListState<MyExchangeRequest>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchWithAuth<MyExchangePage<MyExchangePost>>(`/api/members/me/exchange-posts?page=0&size=${PAGE_SIZE}`),
      fetchWithAuth<MyExchangePage<MyExchangeRequest>>(`/api/members/me/exchange-requests?page=0&size=${PAGE_SIZE}`),
    ])
      .then(([p, r]) => {
        if (cancelled) return;
        setPosts({ items: p.content, total: p.totalElements, page: 0, totalPages: p.totalPages });
        setRequests({ items: r.content, total: r.totalElements, page: 0, totalPages: r.totalPages });
        onCounts?.({ posts: p.totalElements, requests: r.totalElements });
      })
      .catch(() => {
        if (!cancelled) setError("교환 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // onCounts는 부모가 매 렌더 새로 만들어도 다시 읽지 않는다 — 처음 한 번만 센다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      if (mode === "posts") {
        const next = posts.page + 1;
        const p = await fetchWithAuth<MyExchangePage<MyExchangePost>>(`/api/members/me/exchange-posts?page=${next}&size=${PAGE_SIZE}`);
        setPosts((prev) => ({ items: [...prev.items, ...p.content], total: p.totalElements, page: next, totalPages: p.totalPages }));
      } else {
        const next = requests.page + 1;
        const r = await fetchWithAuth<MyExchangePage<MyExchangeRequest>>(`/api/members/me/exchange-requests?page=${next}&size=${PAGE_SIZE}`);
        setRequests((prev) => ({ items: [...prev.items, ...r.content], total: r.totalElements, page: next, totalPages: r.totalPages }));
      }
    } catch {
      setError("더 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchWithAuth, mode, posts.page, requests.page]);

  if (loading) return <p className="py-empty text-center text-body-s text-text-3">불러오는 중...</p>;

  const list = mode === "posts" ? posts : requests;
  const hasMore = list.page + 1 < list.totalPages;

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-card bg-surface-2 px-4 py-3 text-body-s font-semibold text-danger">
          {error}
        </p>
      )}
      {list.items.length === 0 ? (
        <div className="py-empty text-center">
          <p className="text-body-s text-text-2">{mode === "posts" ? "아직 쓴 교환글이 없어요." : "아직 보낸 교환 신청이 없어요."}</p>
          <p className="mt-tight text-label text-text-3">행사 캘린더에서 행사를 골라 교환글을 보고 올릴 수 있어요.</p>
          <NavLink nav="forward" href="/events" className={`mt-row inline-block text-body-s font-bold text-text-1 underline underline-offset-2 ${FOCUS_RING}`}>
            행사 캘린더 보기
          </NavLink>
        </div>
      ) : (
        <ul>
          {mode === "posts"
            ? posts.items.map((post) => <PostRow key={post.postId} post={post} />)
            : requests.items.map((request) => <RequestRow key={request.requestId} request={request} />)}
        </ul>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className={`mt-row h-12 w-full rounded-control border border-border-2 bg-white text-body font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
        >
          {loadingMore ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </div>
  );
}

function eventLine(eventName: string, eventDate: string): string {
  const [, m, d] = eventDate.split("-").map(Number);
  return `${eventName} · ${m}월 ${d}일(${weekdayKo(eventDate)})`;
}

/** 썸네일 + 행사 줄 + 「가진 포카 → 받고 싶은 포카」. 행 전체를 링크로 두지 않는다 — 아래 바로가기와 겹친다. */
function RowBody({
  postId,
  linkable,
  thumbnailUrl,
  meta,
  have,
  wants,
}: {
  postId: number;
  linkable: boolean;
  thumbnailUrl: string | null;
  meta: string;
  have: ExchangeItemView | null;
  wants: ExchangeItemView[];
}) {
  const trade = tradeLine(have, wants);
  const title = (
    <span className="block text-body font-bold text-text-1">
      {trade.have}
      <span className="mx-1 font-medium text-text-3" aria-label="에서">→</span>
      {trade.wants}
    </span>
  );
  return (
    <div className="flex gap-3">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
        <img src={mediaUrl(thumbnailUrl)} alt="" className="h-[52px] w-11 shrink-0 rounded-control bg-surface-2 object-cover" />
      ) : (
        <span aria-hidden="true" className="h-[52px] w-11 shrink-0 rounded-control bg-surface-2" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-label text-text-3">{meta}</p>
        {linkable ? (
          <NavLink nav="forward" href={`/exchanges/${postId}`} className={`mt-1 block rounded-control ${FOCUS_RING}`}>
            {title}
          </NavLink>
        ) : (
          <div className="mt-1">{title}</div>
        )}
      </div>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: string }) {
  return (
    <NavLink nav="forward" href={href} className={`ml-auto inline-flex min-h-11 items-center text-label font-bold text-text-1 underline underline-offset-2 ${FOCUS_RING}`}>
      {children}
    </NavLink>
  );
}

function PostRow({ post }: { post: MyExchangePost }) {
  const status = EXCHANGE_STATUS_TEXT[post.status];
  const pending = post.status === "OPEN" ? post.pendingRequestCount : 0;
  return (
    <li className="border-b border-border py-row">
      {/* 제재된 글은 상세가 404라 링크를 걸지 않는다. */}
      <RowBody
        postId={post.postId}
        linkable={post.status !== "SUSPENDED"}
        thumbnailUrl={post.thumbnailUrl}
        meta={eventLine(post.eventName, post.eventDate)}
        have={post.have}
        wants={post.wants}
      />
      <div className="mt-tight flex items-center gap-2 pl-14">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {pending > 0 && <span className={`${LABEL_STRONG} tabular-nums`}>새 신청 {pending}</span>}
        {pending > 0 && <ActionLink href={`/exchanges/${post.postId}/requests`}>신청 보기</ActionLink>}
        {post.status === "MATCHED" && <ActionLink href={`/exchanges/${post.postId}/thread`}>대화 열기</ActionLink>}
      </div>
    </li>
  );
}

function RequestRow({ request }: { request: MyExchangeRequest }) {
  const status = EXCHANGE_REQUEST_STATUS_TEXT[request.status];
  const post = request.post;
  return (
    <li className="border-b border-border py-row">
      {post ? (
        <RowBody
          postId={post.postId}
          linkable={post.status !== "SUSPENDED"}
          thumbnailUrl={post.thumbnailUrl}
          meta={`${eventLine(post.eventName, post.eventDate)}${post.authorNickname ? ` · ${post.authorNickname}` : ""}`}
          have={post.have}
          wants={post.wants}
        />
      ) : (
        <p className="text-body-s text-text-3">사라진 교환글이에요.</p>
      )}
      <div className="mt-tight flex items-center gap-2 pl-14">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {post && request.threadAvailable && <ActionLink href={`/exchanges/${post.postId}/thread`}>대화 열기</ActionLink>}
      </div>
    </li>
  );
}
