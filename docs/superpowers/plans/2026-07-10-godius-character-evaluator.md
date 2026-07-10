# Godius 캐릭터 육성 평가기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직업/레벨/파라메터/기능 입력을 받아 힘의 구슬 수지로 육성 효율을 S~F 등급 + 상세 분석으로 평가하는 단일 index.html 웹페이지.

**Architecture:** 단일 `index.html`. `<script>` 안에 (1) GAME 데이터 상수, (2) 순수 계산 함수 모듈(`GodiusCalc`), (3) UI 바인딩 코드로 3분할. 계산 로직은 DOM 의존 없이 순수 함수로 작성하여 Node로도 실행·테스트 가능하게 한다. 스펙: `docs/superpowers/specs/2026-07-10-godius-character-evaluator-design.md`.

**Tech Stack:** Vanilla HTML/CSS/JS (외부 의존성 0). 테스트는 core 스크립트를 Node로 추출 실행.

## Global Constraints

- 파일 하나(`index.html`)로 완결. 외부 CDN/라이브러리/서버 금지.
- UI 텍스트는 전부 한국어.
- 게임 수치는 전부 `GAME` 상수 객체에만 존재 (로직에 하드코딩 금지).
- 스탯 키 순서: STR, AGR, DEX, INT, VIT, MEN (게임 표기 유지).

---

### Task 1: 코어 계산 모듈 + 셀프 테스트

**Files:**
- Create: `index.html` (뼈대 + `<script id="godius-core">` 순수 로직)
- Create: `tests/run-tests.mjs` (core 스크립트를 추출해 Node로 실행)

**Interfaces:**
- Produces: `GodiusCalc.earnedOrbs(level)`, `GodiusCalc.paramCost(jobKey, stats)`, `GodiusCalc.skillMinCost(levels)`, `GodiusCalc.skillExpectedCost(levels)`, `GodiusCalc.evaluate(input)`, `GAME` 상수. `evaluate` 입력: `{mainJob, subJob, level, stats:{STR,AGR,DEX,INT,VIT,MEN}, skills:{기능명:레벨}, unspent}`. 반환: `{ok, errors[], warnings[], earned, paramCost, skillMin, skillExpected, skillActual, ratio, grade, savedOrbs}`.

- [ ] **Step 1: 코어 데이터/함수 작성** — `index.html`에 아래 로직 포함:

```js
const GAME = {
  jobs: {
    warrior:  { name: '전사',   base: { STR:12, AGR:6, DEX:10, INT:6,  VIT:6,  MEN:6  }, skills: ['검술','부술','둔기술','격술','회피술'], keyStats: ['STR','VIT'] },
    fighter:  { name: '검투사', base: { STR:12, AGR:6, DEX:6,  INT:6,  VIT:12, MEN:6  }, skills: ['부술','둔기술','회피술','창술','암살검술','격술'], keyStats: ['STR','VIT'] },
    thief:    { name: '도둑',   base: { STR:6,  AGR:6, DEX:6,  INT:6,  VIT:6,  MEN:6  }, skills: ['부술','암살검술','회피술','함정발견','해체술','연막치기','떨어뜨리기'], keyStats: ['DEX','AGR'] },
    wizard:   { name: '마법사', base: { STR:6,  AGR:6, DEX:6,  INT:12, VIT:6,  MEN:10 }, skills: ['격술','화염마법','냉동마법','중성마법'], keyStats: ['VIT','MEN','INT'] },
    cleric:   { name: '성직자', base: { STR:6,  AGR:6, DEX:6,  INT:10, VIT:6,  MEN:12 }, skills: ['둔기술','신성마법','중성마법'], keyStats: ['VIT','MEN','INT'] },
  },
  subJobs: {
    warrior: { name: '전사', skills: ['검술','부술','둔기술','격술','회피술'] },
    thief:   { name: '도둑', skills: ['부술','암살검술','회피술','함정발견','해체술','연막치기','떨어뜨리기'] },
    alchemist:  { name: '연금술사', skills: ['부술','화학','응급처치'] },
    cleric:     { name: '성직자',  skills: ['둔기술','신성마법','중성마법'] },
    tailor:     { name: '재봉사',  skills: ['검술','옷제작','옷수선'] },
    blacksmith: { name: '대장장이', skills: ['둔기술','무기제작','무기수선'] },
    bard:       { name: '바드',   skills: ['창술','주가'] },
  },
  // 검투사는 성직자/연금술사 보조 불가, 주직업과 동일 보조 불가
  subJobBlock: { fighter: ['cleric','alchemist'] },
  totalInitial: 72, creationMaxPerStat: 15, statMax: 30,
  orbTable: [ [2,10,3], [11,30,2], [31,50,4], [51,70,5], [71,80,6], [81,90,7], [91,999,8] ],
  paramCostTiers: [ [15,1], [20,3], [25,4], [30,5] ], // 목표수치 상한, 개수
  skillRate: [ [5,0.9], [10,0.8], [15,0.5], [20,0.3], [25,0.1], [30,0.08] ], // 목표 기능레벨 상한, 성공률
};
```

계산 함수 (`GodiusCalc`):

```js
function orbsAtLevel(l){ const r = GAME.orbTable.find(([a,b]) => l>=a && l<=b); return r ? r[2] : 0; }
function earnedOrbs(level){ let t=0; for(let l=2;l<=level;l++) t+=orbsAtLevel(l); return t; }
function paramUpCost(target){ return GAME.paramCostTiers.find(([max]) => target<=max)[1]; }
function rawStatCost(base,cur){ let c=0; for(let v=base+1;v<=cur;v++) c+=paramUpCost(v); return c; }
function paramCost(jobKey, stats){
  const base = GAME.jobs[jobKey].base;
  const keys = Object.keys(base);
  const raw = keys.reduce((s,k)=>s+rawStatCost(base[k],stats[k]),0);
  const bonus = GAME.totalInitial - keys.reduce((s,k)=>s+base[k],0);
  const placeable = keys.reduce((s,k)=>s+Math.max(0, Math.min(GAME.creationMaxPerStat,stats[k])-base[k]),0);
  return { cost: raw - Math.min(bonus, placeable), bonus, placeable };
}
function skillRate(target){ return GAME.skillRate.find(([max]) => target<=max)[1]; }
function skillMinCost(levels){ return Object.values(levels).reduce((s,v)=>s+Math.max(0,v-1),0); }
function skillExpectedCost(levels){
  let t=0;
  for(const v of Object.values(levels)) for(let x=2;x<=v;x++) t+=1/skillRate(x);
  return t;
}
```

`evaluate(input)`: 검증(스탯 범위, Σmin(15,stat)≥72, 레벨 2~99, 기능 1~30) 후 `skillActual = earned - paramCost - unspent` 계산, `ratio = skillExpected / skillActual`, 등급표 [S≥1.3, A≥1.1, B≥0.9, C≥0.7, D≥0.5, F] 적용. 특수 케이스: `skillMin===0 && skillActual<=0` → grade `'HOLD'`(비축형); `skillActual < skillMin` → warning(수지 모순, 퀘스트 등 추가 획득 가능성 안내) 후 ratio는 1.0으로 클램프하지 않고 `skillActual`을 `skillMin`으로 보정해 상한 등급 S. `skillActual<0` → error.

- [ ] **Step 2: 테스트 러너 작성** — `tests/run-tests.mjs`: index.html에서 `<script id="godius-core">` 내용을 정규식으로 추출, `eval` 후 assert:

```js
assert.equal(C.earnedOrbs(10), 27);   // 9렙업×3
assert.equal(C.earnedOrbs(30), 67);   // +20×2
assert.equal(C.earnedOrbs(50), 147);  // +20×4
assert.equal(C.earnedOrbs(99), 449);  // 147+100+60+70+72
assert.equal(C.rawStatCost(6,30), 69); // 9+15+20+25
assert.equal(C.paramCost('warrior', {STR:15,AGR:9,DEX:15,INT:9,VIT:15,MEN:9}).cost, 0); // 합72, 보너스 26 전부 흡수
assert.equal(C.skillMinCost({검술:10, 회피술:1}), 9);
// skillExpectedCost({검술:6}) = 4/0.9 + 1/0.8 ≈ 5.694
```

- [ ] **Step 3: `node tests/run-tests.mjs` 실행 → 전부 PASS 확인**
- [ ] **Step 4: Commit** — `feat: core calculation module with self-tests`

### Task 2: 입력 폼 UI + 검증

**Files:**
- Modify: `index.html` (body 마크업 + UI 스크립트)

**Interfaces:**
- Consumes: `GAME`, `GodiusCalc.evaluate`
- Produces: 폼 → `collectInput()` → evaluate 입력 객체

- [ ] **Step 1: 4단계 폼 마크업/바인딩** — ① 주직업 카드 버튼(5) + 보조직업 카드 버튼(7, 차단 조합은 disabled), ② 레벨 number input(2~99), ③ 파라메터 6칸(주직업 선택 시 기본값 프리필, min=기본값 max=30), ④ 기능 레벨 목록(주∪보조 기능 자동 생성, 각 1~30, 기본 1) + 미사용 구슬(기본 0). 실시간 검증 메시지 영역.
- [ ] **Step 2: 브라우저에서 조작 확인** (주직업 변경 시 프리필/기능 목록 갱신, 검투사→성직자 disabled)
- [ ] **Step 3: Commit** — `feat: input form with job-aware validation`

### Task 3: 평가 결과 렌더링

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `GodiusCalc.evaluate` 반환 객체

- [ ] **Step 1: 결과 영역 구현** — 등급 카드(S~F/HOLD, 색상: S 금색, A 초록, B 파랑, C 노랑, D 주황, F 빨강), 구슬 수지표(획득/파라메터/기능 이론최소/기능 평균 기대치/실제 기능 소비/낭비 추정 = actual−min), 운 게이지(평균 대비 절약 구슬 = expected−actual), 스탯 진단 코멘트(keyStats 15 미만 지적, 비핵심 스탯 20 초과 과투자 지적, 공식 Tip 인용), 등급별 한줄평(S: "구슬의 신이 함께한다" ~ F: "기능 실패로 구슬을 갈아넣은 허접...").
- [ ] **Step 2: 시나리오 수동 검증** — 전사 Lv30 / STR15 DEX15 VIT15 AGR9 나머지 기본 / 검술10 → earned 67, paramCost 0, skillMin 9, expected ≈ 4/0.9+1/0.8+5/0.5 ≈ 15.69. 미사용 구슬로 actual 조절하며 등급 변화 확인.
- [ ] **Step 3: Commit** — `feat: evaluation result rendering`

### Task 4: 스타일 + 최종 검증

**Files:**
- Modify: `index.html`, Create: `.claude/launch.json` (정적 서버)

- [ ] **Step 1: 게임 분위기 다크 판타지 테마 CSS** (단일 페이지, 모바일 대응 최소한)
- [ ] **Step 2: Node 테스트 재실행 + 브라우저 프리뷰로 전체 플로우 확인** (스크린샷)
- [ ] **Step 3: Commit** — `feat: styling and final polish`
