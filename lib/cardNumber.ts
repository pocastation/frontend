// PG가 내려주는 마스킹 카드번호를 "읽기 쉽게" 그룹핑한다. 카드사·네트워크마다 실제 표기 관례가
// 다르지만(대부분 4-4-4-4, Amex 계열만 4-6-5 15자리), 우리는 카드 네트워크 코드를 따로 받지
// 않으므로 마스킹 문자열의 총 길이로 추정한다 — 15자리는 Amex 계열, 그 외는 4자리 단위로 묶는다.
export function formatCardNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  const compact = raw.replace(/[\s-]/g, "");

  if (compact.length === 15) {
    return [compact.slice(0, 4), compact.slice(4, 10), compact.slice(10, 15)].filter(Boolean).join(" ");
  }

  const groups: string[] = [];
  for (let i = 0; i < compact.length; i += 4) {
    groups.push(compact.slice(i, i + 4));
  }
  return groups.join(" ");
}
