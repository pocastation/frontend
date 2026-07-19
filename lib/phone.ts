// 연락처 입력 자동 하이픈(배송지·결제수단 폼 공통, §13 백로그). 02(서울) 지역번호는 2자리,
// 그 외(010/011 등 휴대폰, 3자리 지역번호)는 3자리로 가정해 타이핑 중간에도 하이픈을 넣는다.
// 최종 자릿수가 정확히 10자리면 뒤늦게 3-3-4로 재정렬한다(예: 011-123-4567, 02-1234-5678 계열).
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
