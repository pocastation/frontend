# 링크 미리보기 이미지용 글꼴

`app/opengraph-image.tsx`가 한글을 그릴 때 쓰는 서브셋 글꼴이다. Satori(next/og)의 내장 글꼴은 라틴만 그려서 한글 글꼴을 직접 넘겨야 한다.

- 원본: Pretendard v1.3.9 `Pretendard-ExtraBold.otf`, `Pretendard-Medium.otf` (npm `pretendard`, `dist/public/static/`)
- 라이선스: SIL Open Font License 1.1 (`OFL.txt`). 글자를 잘라낸 수정본이라 OFL의 예약 글꼴 이름(Pretendard)을 쓰지 않고 이름을 `PocastationOG`로 바꿨다.
- 담긴 글자: `lib/site.ts`의 `BRAND_HEADLINE_LINES`·`BRAND_SUBHEAD` 글자 + `POCASTATION` 영문 + `,.·—`

## 카피를 바꿨을 때 다시 만드는 법

새 글자가 서브셋에 없으면 미리보기에서 두부(□)로 나온다. 카피를 바꾸면 서브셋도 다시 만든다(Python `fonttools` 필요).

```bash
# 1. 이미지에 쓰는 글자 목록
node -e 'const s=require("fs").readFileSync("lib/site.ts","utf8");const l=JSON.parse(s.match(/BRAND_HEADLINE_LINES = (\[.*?\]);/)[1]);const b=JSON.parse(s.match(/BRAND_SUBHEAD = (".*?");/)[1]);process.stdout.write([...new Set(l.join("")+b+"POCASTATIONpocastation ,.·—")].join(""))' > chars.txt
# 2. 원본에서 잘라내기 (굵기마다)
python -m fontTools.subset Pretendard-ExtraBold.otf --text-file=chars.txt --output-file=og-extrabold.otf --layout-features='*' --no-hinting
python -m fontTools.subset Pretendard-Medium.otf --text-file=chars.txt --output-file=og-medium.otf --layout-features='*' --no-hinting
# 3. name 테이블의 글꼴 이름을 PocastationOG로 바꾼다(fontTools TTFont의 name 레코드 1·3·4·6·16, CFF fontNames)
```
