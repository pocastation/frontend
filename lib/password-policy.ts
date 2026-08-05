// 비밀번호 규칙 — 백엔드 PasswordPolicy와 같은 값이다(#261 / BE #252).
//
// 화면에서 먼저 걸러도 서버가 다시 본다. 여기서 하는 일은 "제출하고 나서 400을 보는" 왕복을
// 없애는 것뿐이고, 실제 방어선은 서버다.
//
// ⚠️ 규칙을 바꾸면 백엔드 PasswordPolicy도 함께 고쳐야 한다. 한쪽만 바뀌면 화면은 통과시키는데
//    서버가 거절하는(또는 그 반대) 상태가 되고, 사용자에게는 원인을 알 수 없는 실패로 보인다.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 20;

export const PASSWORD_RULE_TEXT = `영문·숫자·특수문자를 모두 포함한 ${PASSWORD_MIN}~${PASSWORD_MAX}자`;

/** 규칙을 만족하면 null, 아니면 사용자에게 보여줄 문구. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 해요.`;
  }
  if (/\s/.test(password)) {
    // 복사·붙여넣기나 모바일 자동완성으로 붙는 공백은 본인도 다시 못 치는 비밀번호를 만든다.
    return "비밀번호에 공백은 쓸 수 없어요.";
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!-/:-@[-`{-~]/.test(password);
  if (!hasLetter || !hasDigit || !hasSpecial) {
    return "영문·숫자·특수문자를 모두 포함해야 해요.";
  }
  return null;
}

/** 입력 중 실시간 표시용 — 어느 조건이 충족됐는지 하나씩 알려준다. */
export function passwordChecks(password: string) {
  return [
    { label: `${PASSWORD_MIN}~${PASSWORD_MAX}자`, ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX },
    { label: "영문", ok: /[A-Za-z]/.test(password) },
    { label: "숫자", ok: /[0-9]/.test(password) },
    { label: "특수문자", ok: /[!-/:-@[-`{-~]/.test(password) },
  ];
}
