/**
 * 최근 검색어(#493).
 *
 * <p>이 레포에서 `localStorage`를 쓰는 **첫 자리**다. 그래서 규칙을 여기서 정해 둔다.
 *
 * <ul>
 *   <li><b>서버로 보내지 않는다.</b> 검색어는 그 사람이 무엇을 사려는지 그대로 드러내는 정보라
 *       기기 밖으로 나가면 개인정보 처리방침에 적어야 할 항목이 된다. 여기 남는 값은 브라우저를
 *       벗어나지 않으므로 수집이 아니다.</li>
 *   <li><b>읽기·쓰기를 전부 try/catch로 감싼다.</b> 사파리 프라이빗 모드·저장소 차단 설정·용량
 *       초과에서 접근 자체가 throw한다. 검색어를 못 남기는 것 때문에 검색 화면이 죽으면 안 된다.</li>
 *   <li><b>서버 렌더에서는 항상 빈 배열이다.</b> 서버에는 `window`가 없다 — 초기 렌더를 이 값으로
 *       그리면 하이드레이션이 어긋나므로, 화면은 마운트 뒤에 읽어야 한다.</li>
 * </ul>
 */

const STORAGE_KEY = "pocastation.recent-searches";

/** 오래된 것부터 밀어낸다. 칩 두 줄을 넘지 않는 선. */
const MAX_ITEMS = 10;

/** 저장소가 오염됐거나(다른 탭·확장·수동 편집) 형식이 바뀌었을 때 화면을 지키는 방어선. */
function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readRecentSearches(): string[] {
  return parse(readRaw()).slice(0, MAX_ITEMS);
}

/**
 * `useSyncExternalStore`용 구독. localStorage는 React 밖의 저장소라 「이펙트에서 읽어 setState」가
 * 아니라 이 방식이 정석이다 — 이펙트로 하면 초기 렌더 뒤 한 번 더 렌더가 돈다.
 *
 * <p>스냅샷은 <b>파싱 전 원본 문자열</b>이다. 배열을 돌려주면 매번 새 참조라 무한 렌더가 된다 —
 * 파싱은 화면 쪽에서 이 문자열을 메모해 한다.
 */
const listeners = new Set<() => void>();

export function subscribeRecentSearches(onChange: () => void): () => void {
  listeners.add(onChange);
  // 다른 탭에서 지운 것도 반영한다. storage 이벤트는 그 탭 자신에게는 오지 않으므로
  // 같은 탭의 변경은 write()가 직접 알린다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRecentSearchesSnapshot(): string | null {
  return readRaw();
}

/** 서버 렌더 스냅샷 — 저장소가 없으므로 항상 「비어 있음」이다. */
export function getRecentSearchesServerSnapshot(): string | null {
  return null;
}

function write(items: string[]): string[] {
  const next = items.slice(0, MAX_ITEMS);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 화면은 이번 세션 동안 next를 그대로 쓴다 — 다음 방문에 사라질 뿐이다.
  }
  listeners.forEach((listener) => listener());
  return next;
}

/** 같은 검색어를 다시 하면 지우고 맨 앞에 다시 넣는다(순서가 곧 최근성이다). */
export function addRecentSearch(query: string): string[] {
  const value = query.trim();
  if (!value) return readRecentSearches();
  const rest = readRecentSearches().filter((item) => item !== value);
  return write([value, ...rest]);
}

export function removeRecentSearch(query: string): string[] {
  return write(readRecentSearches().filter((item) => item !== query));
}

export function clearRecentSearches(): string[] {
  return write([]);
}
