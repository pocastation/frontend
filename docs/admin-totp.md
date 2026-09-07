# 관리자 TOTP 프론트 (#588)

백엔드 [PR #459](https://github.com/pocastation/backend/pull/459)의 이메일·OAuth 로그인 챌린지 계약과 연동한다. `/auth/totp`에서 2차 인증, PASS 최초 등록, QR·설정 키, 일회용 복구 코드 보관, 분실 복구를 진행한다.

## 인증 흐름

- 일반 회원 로그인 응답은 기존 토큰 처리 유지. 관리자 챌린지 응답에서는 `/me`를 조회하지 않고 `/auth/totp`로 이동.
- 이메일·소셜 로그인 모두 HttpOnly 임시 쿠키로 `/challenge` 조회. 모바일 PASS 복귀에도 같은 방식 사용. 초기 일반 세션 갱신은 해당 경로에서 실행하지 않음.
- PASS에는 서버 발급 `identityVerificationId`만 전달. 복귀 ID가 현재 챌린지의 ID와 일치할 때만 서버에 결과 확인 요청. URL의 PASS 결과 파라미터는 즉시 제거.
- PASS 결과 조회 실패 시 같은 완료 결과 재조회. 이미 끝난 인증 요청을 새 창으로 반복 실행하지 않음.
- 첫 OTP 확인 후 복구 코드 10개를 한 번 표시. 보관 확인을 받으면 회원 조회·로그인 상태 전환. 일반 OTP 확인 후 회원 조회만 실패하면 소모된 OTP를 재제출하지 않고 로그인 완료 처리만 재시도.
- QR 정보가 있는 화면을 새로고침해 정보가 사라졌거나 챌린지가 만료되면 다시 로그인. 만료 시 QR·키·입력값 제거.
- 분실 복구는 PASS 또는 일회용 복구 코드로 새 인증 앱 등록 후 로그인. 기존 인증수단·전체 세션 회수는 서버에서 수행.

## 비밀값 취급

챌린지·설정 키·QR URI·OTP·복구 코드는 React 메모리에만 보관한다. URL·웹 저장소·분석 이벤트에 넣지 않는다. API는 `no-store`, `no-referrer`로 요청하며 일반 인증 API의 401 갱신 재시도를 적용하지 않는다. QR은 `qrcode.react`로 브라우저 내부 생성한다. 인증 화면은 분석·성능 측정 컴포넌트에서 제외하며 검색 색인과 referrer도 차단한다.

## 로컬 검증

```sh
npm ci
npx playwright install chrome
npx playwright test
npx tsc --noEmit
npx eslint app/auth/totp lib/admin-totp.ts lib/auth-context.tsx lib/identity-verification.ts app/login/page.tsx components/SiteTelemetry.tsx app/layout.tsx tests/browser/admin-totp.spec.ts playwright.config.ts
npm run build -- --webpack
```

브라우저 테스트는 로컬 3588 포트에서 실제 프론트 폼·AuthProvider·라우팅·PASS SDK 래퍼를 실행한다. 외부 PASS와 백엔드 API 응답만 모의 처리하며 테스트용 예시 키만 사용한다. 자동 테스트를 실제 PASS 인증 완료 증거로 취급하지 않는다. 로컬에서 이미 3588 서버를 실행 중이면 테스트 설정과 같은 더미 PASS 공개 설정을 사용해야 한다.

13개 시나리오: 관리자·일반 회원 로그인 분기, 최초 등록·QR·복구 코드, 모바일 PASS 복귀, PASS 결과 재조회, 복구 코드 재등록, 401/429/503, 만료 시 키 제거, 다른 요청 ID 거절, 직접 접근, 모바일 360px·PC 1280px 레이아웃.

## 배포 전 확인

1. 백엔드 PR #459의 이메일 로그인 HttpOnly 챌린지 쿠키 보완 포함 여부 확인.
2. 백엔드 `ADMIN_TOTP_KEY`와 관리자 3명의 기존 PASS 본인 정보 확인.
3. 프론트 기존 `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY`, API 오리진 설정 확인. TOTP 비밀키를 프론트 환경변수로 주입하지 않음.
4. 프론트 챌린지 처리 지원을 준비한 뒤 서버 전환. 백엔드만 먼저 배포하지 않음.
5. staging에서 관리자 3명 각각 실제 앱 등록·로그인·PASS 복구·권한 회수, 일반 회원 로그인 유지 확인.

PASS 요청 기준: [PortOne 공식 문서](https://developers.portone.io/sdk/ko/v2-sdk/identity-verification-request). QR 생성 API: [qrcode.react](https://github.com/zpao/qrcode.react).
