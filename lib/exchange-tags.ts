/**
 * 교환글 해시태그 검색 조건(#826). 행사 피드의 URL 쿼리와 서버 파라미터 사이를 잇는다.
 *
 * <p>URL에는 멤버 태그를 「그룹-멤버」 쌍으로 적는다(`idols=3-12`). 서버는 멤버 id만 받지만, 화면은
 * 멤버 이름을 그 그룹의 멤버 목록에서 찾고 그룹 칩의 선택 표시도 해야 해서 그룹을 함께 들고 있다.
 * 링크로 건네받은 화면도 같은 표시를 그릴 수 있어야 한다.
 *
 * <p>{@code side}는 서버와 같은 <b>글쓴이 기준</b>이다. 화면 문구는 읽는 사람 기준이라 반대로
 * 읽힌다 — 「원하는 포카로 찾기」가 글쓴이 보유({@code HAVE})다.
 */

export type ExchangeSide = "HAVE" | "WANT";

export type IdolTag = { artistId: number; idolId: number };

export type ExchangeTagQuery = {
  side: ExchangeSide;
  artistIds: number[];
  idols: IdolTag[];
};

/** 서버 상한(ExchangeFeedFilter.MAX_TAGS)과 같다. 넘기면 400이 온다. */
export const MAX_EXCHANGE_TAGS = 10;

export const EMPTY_TAG_QUERY: ExchangeTagQuery = { side: "HAVE", artistIds: [], idols: [] };

function positiveInt(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

type RawParams = { side?: string; artistIds?: string; idols?: string; artistId?: string };

/** 손으로 고친 URL도 들어온다. 읽을 수 없는 조각은 버리고, 상한을 넘는 꼬리는 자른다. */
export function parseTagQuery(params: RawParams): ExchangeTagQuery {
  const side: ExchangeSide = params.side === "WANT" ? "WANT" : "HAVE";
  // artistId는 #826 이전의 단일 그룹 칩 링크다. 공유된 링크가 남아 있어 그룹 태그 하나로 받는다.
  const rawArtists = [params.artistIds ?? "", params.artistId ?? ""].join(",").split(",");
  const artistIds = unique(
    rawArtists.map(positiveInt).filter((n): n is number => n !== null),
    String,
  );
  const idols = unique(
    (params.idols ?? "")
      .split(",")
      .map((pair) => {
        const [a, i] = pair.split("-");
        const artistId = positiveInt(a ?? "");
        const idolId = positiveInt(i ?? "");
        return artistId && idolId ? { artistId, idolId } : null;
      })
      .filter((t): t is IdolTag => t !== null),
    (t) => String(t.idolId),
  );
  // 멤버 태그의 그룹은 그룹 태그로도 든다. 화면은 「#에스파 #카리나」처럼 그룹 뒤에 멤버를 잇는다.
  // 판매글 상세의 해시태그 링크처럼 멤버만 적힌 URL도 같은 모양이 되도록 빠진 그룹을 채운다.
  const withGroups = [...artistIds];
  idols.forEach((t) => {
    if (!withGroups.includes(t.artistId)) withGroups.push(t.artistId);
  });
  // 상한은 서버가 받는 개수로 센다. 멤버를 고른 그룹은 서버로 가지 않는다(narrowedArtistIds).
  const kept: ExchangeTagQuery = { side, artistIds: [], idols: [] };
  for (const artistId of withGroups) {
    const members = idols.filter((t) => t.artistId === artistId);
    const cost = Math.max(1, members.length);
    if (tagCount(kept) + cost > MAX_EXCHANGE_TAGS) break;
    kept.artistIds.push(artistId);
    kept.idols.push(...members);
  }
  return kept;
}

/**
 * 서버로 보낼 그룹 태그. 멤버를 고른 그룹은 뺀다 — 「에스파 + 카리나」는 카리나를 찾는 뜻이고,
 * 서버도 같은 규칙으로 좁히지만(backend#607) 상한은 좁히기 전에 센다.
 */
export function narrowedArtistIds(q: ExchangeTagQuery): number[] {
  return q.artistIds.filter((id) => !q.idols.some((t) => t.artistId === id));
}

/** 서버가 세는 태그 수. 상한과 「태그를 골랐는가」를 여기서 판단한다. */
export function tagCount(q: ExchangeTagQuery): number {
  return narrowedArtistIds(q).length + q.idols.length;
}

/** 화면 URL의 쿼리. 기본값(HAVE·태그 없음)은 적지 않아 깨끗한 링크가 된다. */
export function tagQueryString(q: ExchangeTagQuery): string {
  const parts: string[] = [];
  if (q.side === "WANT") parts.push("side=WANT");
  if (q.artistIds.length > 0) parts.push(`artistIds=${q.artistIds.join(",")}`);
  if (q.idols.length > 0) parts.push(`idols=${q.idols.map((t) => `${t.artistId}-${t.idolId}`).join(",")}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** 서버 피드 API의 쿼리. 칩 집계도 side 기준이라 태그가 없어도 side는 보낸다. */
export function feedApiQuery(q: ExchangeTagQuery): string {
  const parts = [`side=${q.side}`];
  const artistIds = narrowedArtistIds(q);
  if (artistIds.length > 0) parts.push(`artistIds=${artistIds.join(",")}`);
  if (q.idols.length > 0) parts.push(`idolIds=${q.idols.map((t) => t.idolId).join(",")}`);
  return `?${parts.join("&")}`;
}
