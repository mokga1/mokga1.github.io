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
- 피드백 게시판 (`feedback.html`, GitHub Discussions 기반 giscus)

## 데이터 출처

- [가디우스 공식 홈페이지 가이드](https://www.godius.co.kr/) — 직업별 초기 파라메터, 힘의 구슬 획득량, 파라메터 비용
- 스팀 공식 가이드 — [기능·파라메터](https://steamcommunity.com/sharedfiles/filedetails/?id=3750780737) · [직업별 스킬과 습득 비용](https://steamcommunity.com/sharedfiles/filedetails/?id=3754781582) · [캐릭터 생성](https://steamcommunity.com/sharedfiles/filedetails/?id=3750085168)
- HP/MP/SP 상승 범위는 커뮤니티 공략 수치

## 개발

- 의존성 없는 단일 `index.html`. 게임 수치는 파일 상단 `GAME` 상수에 모여 있습니다.
- 테스트: `node tests/run-tests.mjs`
