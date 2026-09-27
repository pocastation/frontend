# radius 토큰 통일 검증 (#758)

375px, 로컬 dev(백엔드 미기동)에서 캡처.

| 파일 | 확인한 것 |
| --- | --- |
| `components-mobile.png` | 이미지 타일·패널 12px, 오버레이 칩·상태 배지·입력·주/보조 버튼 8px (검증용 임시 라우트, 삭제함) |
| `auctions-mobile.png` | 검색창·정렬 칩이 pill에서 8px로 전환 |
| `login-mobile.png` | 입력·버튼 8px, 소셜 로그인 원형 버튼은 `rounded-full` 유지 |

computed style 실측: `--radius-control` 8px, `--radius-card` 12px, `--radius-sheet` 16px.

## 상태 도트 제거

상태 도트 12곳은 점을 빼고 글자·글자색만 남겼다(관리자 상태 배지는 tone별 글자색). 행사 띠·달력의 건수 점은 날짜 밑 짧은 선으로 바꿨다. 홈 배너·홈 랭킹 넘김 점, 상품 상세 갤러리 점, 알림함 안 읽음 점은 유지한다. 변경 전·후는 검증용 임시 라우트(`/dev-dots`, 삭제함)에서 확인했다.
