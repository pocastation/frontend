# 의존성 보안 점검과 업데이트 (#809)

점검일: 2026-11-05. 기준 develop b84bff787ea807ad30758eeeefaeedcde6ef62ae.
회원 세션 PR #808과 독립된 변경이며 병합·운영 배포는 포함하지 않는다.

## 결과와 한계

동일 시점 npm audit 기준 16개 패키지(critical 1, high 6, moderate 9), 중복 제거한 직접 advisory 23건을 확인했다. 상위 패키지의 전이 경고도 포함하므로 16개의 독립 공격 경로라는 의미는 아니다. 업데이트 후 전체 및 `--omit=dev` 검사 모두 0건이다. 알려지지 않은 취약점까지 없다는 보장은 아니다.

운영 pocastation.com의 정상 GET 응답에서 Vercel을 확인했고, 외부 이미지 URL 최적화 요청은 400 INVALID_IMAGE_OPTIMIZE_REQUEST로 거절됐다. 운영에서 악성 이미지·RCE·부하·캐시 오염 요청은 실행하지 않았다.

최신 origin/main은 1e6db6f8445a161c0005c020eefac25e261f4898. 이 커밋의 Next.js 설정과 패키지도 비교했지만 **운영 도메인의 실제 배포 SHA 및 Vercel 관리형 이미지 처리기 내부 패치 버전은 미확인**이다. Git 브랜치·성공 배포 상태만으로 도메인의 현재 배포와 같다고 간주하지 않는다. 따라서 운영 악용 성공이나 전체 안전성을 확정하지 않는다.

## 공격 조건 대조

| 대상 | 확인 근거와 판정 |
| --- | --- |
| Windows RCE p293-qw3h-jr36 | 운영은 Vercel로 관측. Windows 파일시스템 서버 조건은 운영에서 확인되지 않음. 로컬 Windows 서버를 외부 노출하면 별도 위험 |
| AVIF RCE 2xp9-vwfh-vxw4, sharp rgj7-g3m4-5g8c | 기존 next 16.2.11/sharp 0.35.3은 영향 범위. 외부 URL 허용 목록은 없고 업로드는 별도 API 도메인. 공격자 이미지의 실제 운영 처리 경로·관리형 서비스 패치 상태 미확인. 버전 패치로 해소 |
| SVG RCE 2464-fhr4-w9xw, sharp wq5f-xc86-pv6w | glibc Linux 이미지 처리 관련. SVG 허용 기본값 false, 원격 패턴 없음. 단순 차단 설정만으로 네이티브 라이브러리 안전성을 단정하지 않고 sharp 0.35.5로 패치 |
| OG RCE vcvr-r3jv-pc5j | OG 두 파일은 runtime=edge, 정적 내용. 공지의 Node ImageResponse 조건 불충족 |
| SSRF cjq9-62q9-8jv4 | images.remotePatterns 없음. 운영 외부 URL 요청 거절. 공지의 공격자 제어 허용 호스트 조건 불충족 |
| Server Actions DoS p3m5-59mp-jv5r | 소스 use server 없음, 기존 프로덕션 빌드의 Node/Edge action 목록 모두 0. 최소 한 개 Server Action 조건 불충족 |
| use cache RCE 673q-mjm6-r5xr | use cache 함수 없음, cacheComponents false. 조건 불충족 |
| 자체 호스팅 캐시 오염 4jqv-mc3x-m676 | App Router/Vercel 구성. 공지의 자체 호스팅 Pages Router 조건 불충족 |
| 루트 catch-all 캐시 오염 mcj8-r9mp-w47p | main/develop에 루트 catch-all page 없음. 조건 불충족 |
| 메타데이터 dynamicParams 우회 f87g-xv8r-7p7x | dynamicParams 제한을 사용하는 동적 메타데이터 이미지 경로 없음. 조건 불충족 |
| 개발 MCP 정보 유출 39w2-rjm5-chcv | 개발 서버 대상. 운영에서 개발 서버를 사용하는 근거 없음. 개발 서버도 패치 적용 필요 |
| minimatch·brace-expansion·js-yaml·browserslist·zod | 해당 경고 경로는 dev 의존성. 앱에서 비신뢰 요청을 해당 parser/glob으로 전달하는 경로를 찾지 못함. CI/개발 입력 위험까지 면제하지 않음 |
| baseline-browser-mapping·source-map-js | prod 잠금 의존성에도 포함되지만 앱에서 외부 쿼리·통계를 브라우저 매핑에 전달하거나 사용자 source map을 해석하는 경로를 찾지 못함. 빌드 도구 의존성도 패치 |

각 advisory 원문은 `https://github.com/advisories/GHSA-` 뒤에 표의 ID를 붙여 확인할 수 있다. 버전 범위만으로 운영 악용 가능을 판정하지 않았다.

## 변경

- Next.js 16.2.11 → 16.4.5, eslint-config-next 16.2.10 → 16.4.5.
- sharp 0.35.3 → 0.35.5, brace-expansion 1.1.18 → 1.1.21.
- typescript-eslint 계열 8.62.1 → 8.72.1, js-yaml 4.3.2, browserslist 4.29.5, zod 4.6.7, source-map-js 1.2.2, baseline-browser-mapping 2.11.35로 잠금 갱신.
- typescript-estree의 minimatch만 11.0.1로 override. 10.2.6도 영향 범위이며 안전한 수정은 11.0.1부터다. 상위 패키지의 선언 범위 밖 변경이므로 전체 ESLint·타입·빌드로 호환성 확인. 다른 minimatch 3 계열까지 전역 교체하지 않음.
- `npm audit fix --force` 및 eslint-config-next의 구버전 다운그레이드는 사용하지 않음.
- Next dev가 생성하는 버전별 문서 안내 AGENTS.md 포함. Edge 런타임 deprecation은 있으나 이번 보안 작업에서 Node 런타임으로 전환하지 않음.
- 기존 관리자 OTP 테스트의 저장소 검증에 기존 nav-transition 경로 기록만 명시적으로 허용. 허용 값도 제한하고 토큰·OTP 비밀키·복구 코드 미저장 검증 유지.

## 검증과 배포

전체/운영 audit 0건, 타입·전체 ESLint·프로덕션 빌드 통과. 브라우저·격리 Linux·Preview 최종 결과는 PR의 검증 체크리스트에 기록한다. 브라우저 API는 모의 처리이며 운영 DB나 결제 서비스를 호출하지 않는다.

로컬 Chromium 19개 및 #808 세션 변경을 임시 결합한 8개 테스트 통과. 조합 검사 후 세션 파일은 복원했고 이 PR에 포함하지 않았다.

Linux 비교는 Node 24 Debian glibc 기반 최소 Next 앱으로 수행했다. 전체 운영 앱 복제나 Vercel 내부 런타임 재현은 아니다. 설치·빌드 이후 네트워크를 끊고 CPU 1개·메모리 512MB·실행 제한 45초 조건에서 정상 8×8 PNG/AVIF와 SVG, 외부 URL을 검사했다. 두 버전 모두 PNG/AVIF 200, SVG/외부 URL 400. 악성 파일·네이티브 메모리 손상/RCE 재현은 수행하지 않았다. 따라서 수정 전 RCE 악용 가능 또는 수정 후 모든 공격 불가능을 이 결과만으로 증명하지 않는다.

| Linux 런타임 | 수정 전 | 수정 후 |
| --- | --- | --- |
| next | 16.2.11 | 16.4.5 |
| sharp | 0.35.3 | 0.35.5 |
| libheif | 1.23.1 | 1.23.5 |
| librsvg | 2.62.90 | 2.63.2 |
| libvips | 8.18.3 | 8.18.7 |

보안 패치 적용과 실제 운영 악용의 입증은 별개다. 미확인 운영 항목을 숨기지 않고 보안 업데이트를 먼저 검토 가능하게 제공한다.

병합 전 #808과의 조합도 확인한다. 이후 승인된 develop 배포에서 Preview/실제 API 연결을 확인하고, main 승격은 별도 승인 대상으로 유지한다. 운영 배포 SHA·이미지 최적화 공급자 패치 확인은 미완료 항목이다. 이전 의존성으로 롤백하면 알려진 취약점도 돌아오므로 장애 대응 시 이미지 처리 제한 등 대안과 함께 판단한다.
