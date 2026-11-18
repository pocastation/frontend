"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ExchangeMeetupSection from "@/components/ExchangeMeetupSection";
import ExchangeNoShowSection, { ExchangeNoShowNotice, explainable } from "@/components/ExchangeNoShowSection";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { itemName, itemSource, slotLabel } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  ExchangeAppearanceEntry,
  ExchangeItemView,
  ExchangePostDetail,
  ExchangeRequestListResponse,
  ExchangeThreadResponse,
} from "@/lib/types";

/**
 * 교환 매칭 완료 화면(#819).
 *
 * <p>확정 뒤 화면은 대화가 아니라 현장에서 서로를 알아볼 한 줄을 주고받는 곳이다(backend#612).
 * 채팅으로 두면 지금 모습을 말한 줄이 다른 메시지 사이에 묻힌다.
 *
 * <p>만남 확인 코드(backend#598)는 교환할 포카 다음, 완료 확인 앞에 둔다. 서로를 알아보고 포카를
 * 확인한 뒤에 누르는 버튼이다.
 *
 * <p>노쇼 신고(backend#612)는 만남 확인 다음에 둔다. 만남이 확인되지 않은 교환만 신고할 수 있어서다.
 * 나를 대상으로 한 신고가 해명 기한 안에 있으면 그것만 맨 위로 올린다.
 *
 * <p>약속 장소는 머리에 붙박아 둔다. 현장에서 열었을 때 장소를 찾아 스크롤하지 않게 한다.
 */

/** 서버 {@code ExchangeAppearance.MAX_LENGTH}와 같다. */
const APPEARANCE_MAX = 100;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const time = `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? time : `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}`;
}

type CardRow = { key: string; title: string; item: ExchangeItemView | null; photoUrl: string | null };

export default function ExchangeThreadPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [thread, setThread] = useState<ExchangeThreadResponse | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      router.replace(`/login?redirect=${encodeURIComponent(`/exchanges/${postId}/thread`)}`);
    }
  }, [authLoading, member, postId, router]);

  const loadThread = useCallback(async () => {
    const res = await fetchWithAuth<ExchangeThreadResponse>(`/api/exchanges/${postId}/thread`);
    setThread(res);
    return res;
  }, [fetchWithAuth, postId]);

  /**
   * 상대 인상착의·만남·완료 상태를 다시 받는다. 주기 폴링은 두지 않는다. 인상착의는 자주 바뀌지 않고,
   * 현장에서는 폰을 다시 켜는 순간(화면 복귀)이 대부분이라 그때와 버튼을 누를 때만 묻는다.
   * 입력하던 내 인상착의(draft)는 건드리지 않는다.
   */
  const [refreshing, setRefreshing] = useState(false);
  const refreshThread = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadThread();
    } catch {
      // 갱신 실패는 지금 보이는 값을 그대로 둔다. 다음 복귀나 버튼에서 다시 묻는다.
    } finally {
      setRefreshing(false);
    }
  }, [loadThread]);

  useEffect(() => {
    if (!thread) return;
    const onVisibility = () => {
      if (!document.hidden) void refreshThread();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [thread, refreshThread]);

  /**
   * 교환할 포카. 줄 포카가 먼저, 받을 포카가 다음이다.
   *
   * <p>교환글의 가진 포카와 확정된 신청의 제시 포카(대화 응답의 `offer`, backend#618) 두 개다. 작성자에게는
   * 가진 포카가 줄 것, 신청자에게는 제시 포카가 줄 것이다.
   *
   * <p>`offer`가 없는 응답(backend#618 배포 전)이면 작성자는 받은 신청 목록에서 찾는다. 신청자는 그 목록을
   * 볼 수 없어 받을 포카 한 줄만 남는다.
   */
  const loadCards = useCallback(async (t: ExchangeThreadResponse) => {
    const post = await fetchWithAuth<ExchangePostDetail>(`/api/exchanges/${postId}`);
    const author = Boolean(post.viewer?.author);
    const have = { item: post.have, photoUrl: post.photos[0]?.thumbnailUrl ?? null };
    let offer: { item: ExchangeItemView; photoUrl: string | null } | null = t.offer
      ? { item: t.offer, photoUrl: t.offerPhotoUrl ?? null }
      : null;
    if (!offer && author) {
      try {
        const requests = await fetchWithAuth<ExchangeRequestListResponse>(`/api/exchanges/${postId}/requests`);
        const accepted = requests.content.find((r) => r.status === "ACCEPTED");
        if (accepted) offer = { item: accepted.offer, photoUrl: accepted.photos[0]?.thumbnailUrl ?? null };
      } catch {
        // 받을 포카를 못 불러와도 인상착의·완료 확인은 써야 한다. 줄 포카만 남긴다.
      }
    }
    const give = author ? have : offer;
    const receive = author ? offer : have;
    const rows: CardRow[] = [];
    if (give) rows.push({ key: "give", title: "내가 줄 포카", ...give });
    if (receive) rows.push({ key: "receive", title: "받을 포카", ...receive });
    setCards(rows);
  }, [fetchWithAuth, postId]);

  useEffect(() => {
    if (authLoading || !member) return;
    let cancelled = false;
    (async () => {
      let res: ExchangeThreadResponse;
      try {
        res = await loadThread();
        if (!cancelled) setDraft(res.appearance?.mine?.body ?? "");
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "교환 정보를 불러오지 못했어요.");
        return;
      }
      try {
        await loadCards(res);
      } catch {
        // 품목은 보조 정보다. 실패해도 화면은 남긴다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, member, loadThread, loadCards]);

  async function saveAppearance() {
    const body = draft.trim();
    if (!body || saving || !thread) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await fetchWithAuth<ExchangeAppearanceEntry>(`/api/exchanges/${postId}/appearance`, {
        method: "PUT",
        body: { body },
      });
      setThread((prev) => (prev ? { ...prev, appearance: { ...prev.appearance, mine: saved } } : prev));
      setDraft(saved.body);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인상착의를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function act(path: string, failure: string) {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      await fetchWithAuth<void>(path, { method: "POST" });
      await loadThread();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setActing(false);
    }
  }

  if (loadError) {
    return (
      <>
        <MobilePageHead title="교환 매칭 완료" backHref={`/exchanges/${postId}`} />
        <p className="px-gutter py-empty text-center text-body-s text-text-3">{loadError}</p>
      </>
    );
  }

  const nickname = thread?.counterpartNickname ?? "상대";
  const completion = thread?.completion;
  const appearance = thread?.appearance;
  const mine = appearance?.mine ?? null;
  const counterpart = appearance?.counterpart ?? null;
  const writable = appearance?.writable ?? false;
  const trimmed = draft.trim();
  const dirty = trimmed !== (mine?.body ?? "");

  return (
    <>
      <MobilePageHead
        title="교환 매칭 완료"
        sub={thread ? `${nickname}님과 교환이 확정됐어요` : undefined}
        backHref={`/exchanges/${postId}`}
      />

      {/* 레이아웃은 모바일에만 푸터 앞 여백을 준다. PC는 마지막 섹션(만남·완료 확인)이 푸터에 붙지 않게 여기서 준다. */}
      <div className="mx-auto max-w-[640px] sm:pb-footer">
        {thread && (
          <div className="sticky top-12 z-[2] sm:top-15 flex items-center gap-3 border-b border-border bg-surface-2 px-gutter py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-extrabold text-text-1">{thread.place}</p>
              {thread.slot && <p className="mt-px font-display text-label text-text-2">{slotLabel(thread.slot)}</p>}
            </div>
            <Link href={`/exchanges/${postId}`} className={`shrink-0 text-label font-bold text-primary ${FOCUS_RING}`}>
              교환글 →
            </Link>
          </div>
        )}

        {thread && (
          <>
            {thread.noShow?.againstMe && explainable(thread.noShow.againstMe) && (
              <ExchangeNoShowNotice
                postId={postId}
                report={thread.noShow.againstMe}
                nickname={nickname}
                fetchWithAuth={fetchWithAuth}
                onChanged={loadThread}
              />
            )}

            {/* 인상착의 */}
            <section className="px-gutter pt-page" aria-labelledby="appearance-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="appearance-title" className="text-body-l font-extrabold text-text-1">
                  인상착의
                </h2>
                <span className="shrink-0 text-label text-text-3">매칭된 두 사람에게만 보여요</span>
              </div>
              <p className="mt-tight text-label text-text-2">
                현장에서 서로 알아볼 수 있게 옷차림이나 소지품을 적어주세요.
              </p>

              <div className="mt-head">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-label font-bold text-text-2"
                  >
                    {nickname.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-s font-bold text-text-1">{nickname}</span>
                  {counterpart && (
                    <span className="shrink-0 text-label text-text-3">상대방 · {timeLabel(counterpart.updatedAt)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void refreshThread()}
                    disabled={refreshing}
                    className={`-my-2 shrink-0 rounded-control px-2 py-2 text-label font-bold text-text-2 disabled:text-text-3 ${FOCUS_RING}`}
                  >
                    {refreshing ? "불러오는 중" : "새로고침"}
                  </button>
                </div>
                {counterpart ? (
                  <p className="mt-tight whitespace-pre-wrap break-words rounded-card bg-surface-2 p-card text-body text-text-1">
                    {counterpart.body}
                  </p>
                ) : (
                  <p className="mt-tight text-body-s text-text-3">아직 인상착의를 적지 않았어요.</p>
                )}
              </div>

              <div className="mt-group rounded-card border border-border-2 p-card focus-within:border-primary">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="my-appearance" className="text-body-s font-bold text-text-1">
                    내 인상착의
                  </label>
                  {writable && (
                    <span className="font-display text-label text-text-3">
                      {draft.length} / {APPEARANCE_MAX}
                    </span>
                  )}
                </div>
                {writable ? (
                  <>
                    <textarea
                      id="my-appearance"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={APPEARANCE_MAX}
                      rows={2}
                      placeholder="예) 검은 볼캡, 회색 후드티, 투명 포카 바인더"
                      className="mt-tight block w-full resize-none rounded-control border border-border px-3 py-3 text-body-l text-text-1 outline-none placeholder:text-text-3"
                    />
                    <div className="mt-tight flex items-center justify-end gap-3">
                      {mine && !dirty && <span className="text-label text-text-3">저장됨 · {timeLabel(mine.updatedAt)}</span>}
                      <button
                        type="button"
                        onClick={saveAppearance}
                        disabled={!trimmed || !dirty || saving}
                        className={`h-10 shrink-0 rounded-control bg-primary px-4 text-body-s font-extrabold text-white disabled:opacity-40 ${FOCUS_RING}`}
                      >
                        {saving ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-tight whitespace-pre-wrap break-words text-body text-text-1">
                    {mine?.body ?? <span className="text-text-3">적지 않았어요.</span>}
                  </p>
                )}
              </div>
            </section>

            {/* 교환할 포카 */}
            {cards.length > 0 && (
              <section className="mt-section-ruled border-t border-border px-gutter pt-section-ruled" aria-labelledby="cards-title">
                <h2 id="cards-title" className="text-body-l font-extrabold text-text-1">
                  교환할 포카
                </h2>
                <ul className="mt-head">
                  {cards.map((row) => (
                    <li key={row.key} className="flex items-center gap-3 py-2">
                      <span className="block h-14 w-11 shrink-0 overflow-hidden rounded-control border border-border bg-surface-2">
                        {row.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                          <img src={mediaUrl(row.photoUrl)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-bold text-text-1">
                          {row.title} · {itemName(row.item)}
                        </span>
                        <span className="mt-px block truncate text-label text-text-3">
                          {itemSource(row.item)}
                          {row.item?.grade ? ` · ${row.item.grade}급` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {thread.meetup && (
              <ExchangeMeetupSection
                postId={postId}
                meetup={thread.meetup}
                fetchWithAuth={fetchWithAuth}
                onChanged={loadThread}
              />
            )}

            {thread.noShow && (
              <ExchangeNoShowSection
                postId={postId}
                noShow={thread.noShow}
                meetup={thread.meetup}
                nickname={nickname}
                fetchWithAuth={fetchWithAuth}
                onChanged={loadThread}
              />
            )}

            {error && (
              <p role="alert" className="mx-gutter mt-group rounded-card bg-surface-2 px-4 py-3 text-body-s font-semibold text-danger">
                {error}
              </p>
            )}

            {/* 완료 확인. 상태가 다섯이고 한 번에 하나만 보인다. */}
            {completion && (completion.confirmable || completion.confirmed || !thread.writable) && (
              <section className="mt-section-ruled border-t border-border px-gutter pt-section-ruled">
                {completion.confirmed && completion.disputed ? (
                  <p className="text-body-s text-text-2">교환이 이뤄지지 않은 것으로 정리됐어요. 기록은 남지 않아요.</p>
                ) : completion.confirmed && completion.confirmedByMe ? (
                  <p className="text-body-s text-text-2">
                    교환 완료로 확인했어요. 상대가 이의 없이 24시간이 지나면 기록에 남아요.
                  </p>
                ) : completion.confirmed ? (
                  <>
                    <p className="text-body-s text-text-2">
                      {nickname}님이 <b className="font-bold text-text-1">교환 완료를 확인</b>했어요. 사실과 다르면
                      알려주세요.
                    </p>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => act(`/api/exchanges/${postId}/completion/dispute`, "이의를 보내지 못했어요.")}
                      className={`mt-cta h-12 w-full rounded-control border border-border-2 bg-white text-body font-extrabold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
                    >
                      교환이 이뤄지지 않았어요
                    </button>
                  </>
                ) : completion.confirmable ? (
                  <>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => act(`/api/exchanges/${postId}/completion`, "완료 확인에 실패했어요.")}
                      className={`h-12 w-full rounded-control border border-text-1 bg-white text-body-l font-extrabold text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
                    >
                      교환 완료 확인
                    </button>
                    <p className="mt-tight text-label text-text-3">
                      한 분만 눌러도 완료돼요. 상대는 24시간 안에 아니라고 알릴 수 있어요.
                    </p>
                  </>
                ) : (
                  <p className="text-body-s text-text-3">
                    행사가 끝나고 3일이 지나 인상착의를 고칠 수 없어요. 적어 둔 내용은 계속 볼 수 있어요.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
