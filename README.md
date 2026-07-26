# 가디우스 캐릭터 육성 평가기

[Godius Eternal War](https://store.steampowered.com/app/4559140/Godius_Eternal_War/) 캐릭터가 잘 컸는지 힘의 구슬 수지로 진단하는 웹 도구입니다.

**사용하기:** https://mokga1.github.io/

## 기능

- 직업(주/보조)·레벨·파라메터·기능 레벨·습득 마법을 입력하면 S~F 등급으로 육성 효율 평가
- 힘의 구슬 수지표: 획득량 대비 파라메터/마법 습득/기능 훈련 소비 내역과 실패 소실 추정
- 스팀 공식 가이드의 정확한 기능 성공률표(레벨 2 90% ~ 레벨 30 6%) 기반 평균 유저 대비 운 게이지
- HP/MP/SP 성장운 진단 (직업별 레벨업 상승 범위 대비 평균 이상/이하)
- 리세마라 진단 (옵션): Lv50까지 기능 2개 25/25 목표 — 계속 진행할지, 삭제 후 재생성할지 제안
- 직업별 육성 팁
- 공략 가이드 (`guide/`) — 초보자·구슬 시스템·리세마라·직업별 5종·사냥터 도감·스팀 서버 차이
- 피드백 게시판 (`feedback.html`, Cusdis 기반 — 관리자 승인 후 공개)

## 데이터 출처

- [가디우스 공식 홈페이지 가이드](https://www.godius.co.kr/) — 직업별 초기 파라메터, 힘의 구슬 획득량, 파라메터 비용
- 스팀 공식 가이드 — [기능·파라메터](https://steamcommunity.com/sharedfiles/filedetails/?id=3750780737) · [직업별 스킬과 습득 비용](https://steamcommunity.com/sharedfiles/filedetails/?id=3754781582) · [캐릭터 생성](https://steamcommunity.com/sharedfiles/filedetails/?id=3750085168)
- HP/MP/SP 상승 범위는 커뮤니티 공략 수치

## 개발

- 의존성 없는 단일 `index.html`. 게임 수치는 파일 상단 `GAME` 상수에 모여 있습니다.
- 테스트: `node tests/run-tests.mjs`
- **영어판**(`en/index.html`)은 직접 수정하지 말 것 — `index.html` 수정 후 `node tools/build-en.mjs`로 재생성합니다 (번역 사전 기반, 미번역 잔여 한글을 보고해줌).
- **몬스터 도감 표**(`guide/monsters.html`의 `<!-- ZONES:n -->` 구간)도 직접 수정하지 말 것 —
  원본은 `tools/monster-data.mjs`이고, 고친 뒤 `node tools/build-monsters.mjs`로 정적 HTML을 재생성합니다.
  (표를 JS로 그리면 검색엔진·AdSense 크롤러가 내용을 읽지 못해 빈 페이지로 취급됩니다.)
- 새 페이지 추가 시 `node tools/add-og.mjs`의 페이지 목록에 넣고 실행하면 OG/canonical 태그가 삽입됩니다. `sitemap.xml`에도 추가하세요.

### 콘텐츠 작성 시 주의 (AdSense)

크롤러는 JavaScript 실행 전 HTML만 읽는다고 가정하세요. 사용자에게 보여줄 설명·표·해설은
**정적 HTML로 박아 넣어야** 합니다. 계산 결과처럼 입력이 있어야 나오는 것만 JS로 생성합니다.
`feedback.html`과 `404.html`은 본문이 얇아 의도적으로 광고 코드를 넣지 않았습니다.
