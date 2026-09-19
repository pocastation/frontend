import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch, ApiError, mediaUrl } from "@/lib/api";
import { itemDetail, itemName, slotLabel } from "@/lib/exchange-labels";
import type { ExchangePostDetail } from "@/lib/types";

/**
 * 교환글 상세(#662).
 *
 * <p>정보를 <code>라벨 | 값</code> 표 하나로 늘어놓지 않는다. 포카 이름은 <b>제목</b>, 교환 방향은
 * <b>세로선으로 가른 두 칸</b>, 만날 곳은 <b>회색 띠</b>다 — 성격이 다른 셋이 서로 다른 지면에 앉는다.
 *
 * <p>신청 버튼은 자리만 둔다. 누를 곳(신청 흐름)이 아직 없어 비활성으로 두고 문구로 알린다.
 * 링크를 붙이면 빈 화면으로 보내게 된다.
 */

async function getPost(id: string): Promise<ExchangePostDetail | null> {
  try {
    return await apiFetch<ExchangePostDetail>(`/api/exchanges/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  return { title: post ? `${itemName(post.have)} 교환` : "교환글" };
}

export default async function ExchangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    notFound();
  }

  const [cover, ...rest] = post.photos;

  return (
    <>
      <MobilePageHead title="교환글" sub={post.authorNickname ?? undefined} />

      <div className="mx-auto max-w-[760px] pb-10 sm:px-4 sm:py-8">
        {cover && (
          <div className="flex gap-1.5 px-[14px] pt-3 sm:px-0">
            <div className="relative flex-[1.8] overflow-hidden rounded-r1 border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
              <img src={mediaUrl(cover.url)} alt="" className="aspect-[1/1.18] w-full object-cover" />
            </div>
            {rest.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                {rest.map((photo) => (
                  <div key={photo.url} className="flex-1 overflow-hidden rounded-r1 border border-border bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
                    <img src={mediaUrl(photo.url)} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-[14px] pt-3.5 sm:px-0">
          <h1 className="text-xl font-extrabold tracking-[-0.025em] text-text-1">{itemName(post.have)}</h1>
          <p className="mt-0.5 text-xs font-semibold text-text-3">{itemDetail(post.have)}</p>
        </div>

        <div className="px-[14px] pt-3.5 sm:px-0">
          <div className="flex overflow-hidden rounded-r2 border border-border-2">
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-[10px] font-extrabold tracking-[0.04em] text-text-3">내가 줄 것</p>
              <p className="mt-0.5 truncate text-sm font-extrabold tracking-[-0.015em] text-text-1">
                {itemName(post.have)}
              </p>
              <p className="mt-px truncate text-[10.5px] text-text-3">{itemDetail(post.have)}</p>
            </div>
            <div aria-hidden="true" className="w-px bg-border-2" />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-[10px] font-extrabold tracking-[0.04em] text-text-3">받고 싶은 것</p>
              <p className="mt-0.5 truncate text-sm font-extrabold tracking-[-0.015em] text-primary">
                {post.wants.map(itemName).join(" · ") || "—"}
              </p>
              <p className="mt-px truncate text-[10.5px] text-text-3">
                {post.wants[0] ? itemDetail(post.wants[0]) : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-surface-2 px-[14px] py-3.5 sm:rounded-r2 sm:px-4">
          <p className="text-[10px] font-extrabold tracking-[0.04em] text-text-3">만날 곳</p>
          <p className="mt-0.5 text-[14.5px] font-extrabold tracking-[-0.015em] text-text-1">{post.place}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.slots.map((slot) => (
              <span
                key={`${slot.phase}-${slot.fromHour}`}
                className="rounded-[3px] border border-border-2 bg-white px-2.5 py-[5px] text-[11.5px] font-bold text-text-2"
              >
                {slotLabel(slot)}
              </span>
            ))}
          </div>
        </div>

        <div className="px-[14px] pt-4 sm:px-0">
          <button
            type="button"
            disabled
            className="flex h-12 w-full items-center justify-center rounded-[7px] border border-border-2 bg-white text-[15px] font-extrabold text-text-3"
          >
            교환 신청하기
          </button>
          <p className="pt-2 text-center text-[11.5px] text-text-3">
            신청 기능은 준비 중이에요. 열리면 알려드릴게요.
          </p>
        </div>
      </div>
    </>
  );
}
