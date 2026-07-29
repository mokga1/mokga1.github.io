// index.html의 <script id="godius-core"> 블록을 추출해 Node에서 검증한다.
// 실행: node tests/run-tests.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const m = html.match(/<script id="godius-core">([\s\S]*?)<\/script>/);
assert.ok(m, 'godius-core 스크립트 블록을 찾지 못했습니다');
const C = new Function(`${m[1]}; return GodiusCalc;`)();

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`FAIL - ${name}\n    ${e.message}`); process.exitCode = 1; }
}

// --- 힘의구슬 획득 ---
test('earnedOrbs: 레벨 10 = 27 (9렙업 x 3)', () => assert.equal(C.earnedOrbs(10), 27));
test('earnedOrbs: 레벨 30 = 67 (+20x2)', () => assert.equal(C.earnedOrbs(30), 67));
test('earnedOrbs: 레벨 50 = 147 (+20x4)', () => assert.equal(C.earnedOrbs(50), 147));
test('earnedOrbs: 레벨 99 = 449', () => assert.equal(C.earnedOrbs(99), 449));
test('earnedOrbs: 레벨 2 = 3', () => assert.equal(C.earnedOrbs(2), 3));

// --- 파라메터 비용 ---
test('rawStatCost: 6→30 = 69 (9x1+5x3+5x4+5x5)', () => assert.equal(C.rawStatCost(6, 30), 69));
test('rawStatCost: 6→15 = 9', () => assert.equal(C.rawStatCost(6, 15), 9));
test('rawStatCost: 15→16 = 3', () => assert.equal(C.rawStatCost(15, 16), 3));
test('paramCost: 전사 합72 배분이면 비용 0', () => {
  const r = C.paramCost('warrior', { STR: 15, AGR: 9, DEX: 15, INT: 9, VIT: 15, MEN: 9 });
  assert.equal(r.cost, 0);
  assert.equal(r.bonus, 26); // 72 - 기본합 46
});
test('paramCost: 보너스 초과 상승분은 비용 발생', () => {
  // 전사 STR 20: 13~15는 보너스로 흡수 가능(1개짜리), 16~20은 3개씩
  const r = C.paramCost('warrior', { STR: 20, AGR: 12, DEX: 15, INT: 10, VIT: 15, MEN: 10 });
  // raw = (13..15:3 + 16..20:15) + 6 + 5 + 4 + 9 + 4 = 46, placeable = 3+6+5+4+9+4 = 31 → 절약 26
  assert.equal(r.cost, 20);
});

// --- 기능 비용 ---
test('skillMinCost: 검술10 + 회피술1 = 9', () => assert.equal(C.skillMinCost({ 검술: 10, 회피술: 1 }), 9));
test('skillExpectedCost: 기능 6레벨 (스팀 성공률표)', () => {
  const v = C.skillExpectedCost({ 검술: 6 }); // 2:90 3:90 4:85 5:80 6:75
  const expect = 1 / 0.9 + 1 / 0.9 + 1 / 0.85 + 1 / 0.8 + 1 / 0.75;
  assert.ok(Math.abs(v - expect) < 1e-9, `got ${v}`);
});
test('skillExpectedCost: 레벨1은 0', () => assert.equal(C.skillExpectedCost({ 검술: 1 }), 0));
test('skillRateAt: 30레벨 성공률 6%', () => assert.equal(C.skillRateAt(30), 0.06));
test('skillRateAt: 20레벨 성공률 12%', () => assert.equal(C.skillRateAt(20), 0.12));

// --- 보장성 비용과 합리적 선택 ---
test('skillGuaranteedAt: 10→2개, 20→5개, 30→15개', () => {
  assert.equal(C.skillGuaranteedAt(10), 2);
  assert.equal(C.skillGuaranteedAt(20), 5);
  assert.equal(C.skillGuaranteedAt(30), 15);
});
test('skillStepCost: 저레벨은 확률성이 유리 (11레벨 = 2)', () =>
  assert.equal(C.skillStepCost(11), 2)); // 1/0.5 = 2 < 보장성 3
test('skillStepCost: 19~20레벨은 보장성이 유리 (= 5)', () => {
  assert.equal(C.skillStepCost(19), 5); // 1/0.15 = 6.67 > 5
  assert.equal(C.skillStepCost(20), 5); // 1/0.12 = 8.33 > 5
});
test('skillStepCost: 26~30레벨은 보장성이 유리 (= 15)', () =>
  assert.equal(C.skillStepCost(30), 15)); // 1/0.06 = 16.67 > 15
test('skillExpectedCost: 1→30 합리적 기대 비용 ≈ 171.35', () => {
  const v = C.skillExpectedCost({ 검술: 30 });
  assert.ok(Math.abs(v - 171.3466) < 0.001, `got ${v}`);
});
test('trainingAdvice: 구간별 유불리 자동 산출', () => {
  const a = C.trainingAdvice();
  assert.deepEqual(a, [
    { from: 2, to: 17, best: 'chance' },
    { from: 18, to: 18, best: 'tie' },
    { from: 19, to: 20, best: 'guaranteed' },
    { from: 21, to: 25, best: 'tie' },
    { from: 26, to: 30, best: 'guaranteed' },
  ]);
});

// --- 마법 습득 비용 ---
test('spellCost: 마법사 파이어스톰5 + 홀드3 = 8', () =>
  assert.equal(C.spellCost('wizard', 'bard', ['파이어스톰', '홀드']), 8));
test('spellCost: 직업 조합에 없는 마법은 무시', () =>
  assert.equal(C.spellCost('warrior', 'bard', ['큐어', '파이어스톰']), 0));
test('spellCost: 주직업 성직자는 신성마법 습득 가능 (타직업 기술은 무시)', () =>
  assert.equal(C.spellCost('cleric', 'tailor', ['리저렉트', '실드블럭']), 4));
test('availableSpellGroups: 도둑+바드는 습득 가능 마법 없음', () =>
  assert.equal(C.availableSpellGroups('thief', 'bard').length, 0));

// --- HP/MP/SP 성장 진단 ---
test('autoAllocate: 전사 초기 배분 추정 (합 72)', () => {
  const a = C.autoAllocate('warrior');
  assert.deepEqual(a, { STR: 15, AGR: 15, DEX: 15, INT: 6, VIT: 15, MEN: 6 });
});
test('evaluateVitals: 전사 Lv30 HP 범위 88~117', () => {
  const v = C.evaluateVitals('warrior', 30, { HP: 100 });
  assert.equal(v.length, 1); // 미입력 MP/SP는 제외
  assert.equal(v[0].min, 88);   // VIT15x2 + 29x2
  assert.equal(v[0].max, 117);  // VIT15x2 + 29x3
  assert.equal(v[0].verdict, 'below'); // (100-88)/29 = 0.41 < 0.45
});
test('evaluateVitals: 평균 이상 판정', () => {
  const v = C.evaluateVitals('warrior', 30, { HP: 110 });
  assert.equal(v[0].verdict, 'above'); // 0.76
});
test('evaluateVitals: 마법사 Lv10 MP 범위 48~57', () => {
  const v = C.evaluateVitals('wizard', 10, { MP: 50 });
  assert.equal(v[0].min, 48);  // MEN15x2 + 9x2
  assert.equal(v[0].max, 57);  // MEN15x2 + 9x3
});
test('evaluateVitals: 범위 초과는 over 판정', () => {
  const v = C.evaluateVitals('warrior', 30, { HP: 200 });
  assert.equal(v[0].verdict, 'over');
});
// --- 리세마라 진단 ---
test('rerollCheck: 기능 2개 25 달성 시 success', () => {
  const r = C.rerollCheck(50, { 검술: 25, 회피술: 25, 부술: 1 }, 0);
  assert.equal(r.status, 'success');
});
test('rerollCheck: 남은 구슬로 최소 필요량 미달 시 impossible', () => {
  const r = C.rerollCheck(49, { 검술: 20, 회피술: 20 }, 0);
  assert.equal(r.future, 4); // 147 - 143
  assert.equal(r.needMin, 10);
  assert.equal(r.status, 'impossible');
});
test('rerollCheck: 기대치 이상 여유면 green', () => {
  const r = C.rerollCheck(30, { 검술: 24, 회피술: 24 }, 0);
  assert.equal(r.available, 80);
  assert.equal(r.needMin, 2);
  assert.ok(Math.abs(r.expected - 20) < 1e-9); // 2 x 1/0.1
  assert.equal(r.status, 'green');
});
test('rerollCheck: 처음부터는 평균 기대치 부족 → yellow', () => {
  const r = C.rerollCheck(10, { 검술: 1, 회피술: 1 }, 0);
  assert.equal(r.status, 'yellow');
});
test('rerollCheck: 레벨 50 초과는 null', () => {
  assert.equal(C.rerollCheck(51, { 검술: 25, 회피술: 25 }, 0), null);
});

// --- 리세마라 성공 확률 시뮬레이션 ---
test('rerollSuccessProb: 이미 달성이면 1', () =>
  assert.equal(C.rerollSuccessProb(50, { 검술: 25, 회피술: 25 }, 0), 1));
test('rerollSuccessProb: 수학적 불가능이면 0', () =>
  assert.equal(C.rerollSuccessProb(49, { 검술: 20, 회피술: 20 }, 0, 2000), 0)); // 남은 10단계 > 예산 4
test('rerollSuccessProb: 보장성 마감 가능하면 1', () =>
  assert.equal(C.rerollSuccessProb(30, { 검술: 24, 회피술: 24 }, 0, 2000), 1)); // 보장성 20개 <= 예산 80
test('rerollSuccessProb: 0과 1 사이의 확률 반환', () => {
  const p = C.rerollSuccessProb(42, { 검술: 25, 회피술: 22 }, 3, 4000);
  assert.ok(p > 0 && p <= 1, `got ${p}`); // 회피 22→25 잔여, 자원 35개면 대부분 성공
  assert.ok(p > 0.8, `expected high prob, got ${p}`); // 남은 보장성 30 <= 35 → 사실상 확정
});
test('rerollSuccessProb: 레벨 50 초과는 null', () =>
  assert.equal(C.rerollSuccessProb(51, { 검술: 25, 회피술: 25 }, 0), null));

// --- 등급 ---
test('gradeOf 경계값', () => {
  assert.equal(C.gradeOf(1.3), 'S');
  assert.equal(C.gradeOf(1.1), 'A');
  assert.equal(C.gradeOf(0.9), 'B');
  assert.equal(C.gradeOf(0.7), 'C');
  assert.equal(C.gradeOf(0.5), 'D');
  assert.equal(C.gradeOf(0.49), 'F');
});

// --- evaluate 통합 ---
const baseInput = {
  mainJob: 'warrior', subJob: 'tailor', level: 30,
  stats: { STR: 15, AGR: 9, DEX: 15, INT: 9, VIT: 15, MEN: 9 },
  skills: { 검술: 10, 부술: 1, 둔기술: 1, 격술: 1, 회피술: 1, 옷제작: 1, 옷수선: 1 },
  unspent: 0,
};
test('evaluate: 정상 케이스 수지 계산', () => {
  const r = C.evaluate(baseInput);
  assert.ok(r.ok, r.errors && r.errors.join(','));
  assert.equal(r.earned, 67);
  assert.equal(r.paramCost, 0);
  assert.equal(r.skillMin, 9);
  assert.equal(r.skillActual, 67); // 전부 기능에 사용된 것으로 간주
  // expected = 4/0.9 + 5/0.8 = 10.69... → ratio = 10.69/67 → F
  assert.equal(r.grade, 'F');
});
test('evaluate: 미사용 구슬 반영 시 등급 상승', () => {
  const r = C.evaluate({ ...baseInput, unspent: 55 });
  assert.ok(r.ok);
  assert.equal(r.skillActual, 12);
  assert.equal(r.grade, 'B'); // 12.43/12 ≈ 1.04 → B
});
test('evaluate: 이론 최소보다 적게 쓴 모순 입력은 경고 + 최상 보정', () => {
  const r = C.evaluate({ ...baseInput, unspent: 60 }); // actual 7 < min 9
  assert.ok(r.ok);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.adjustedSkillSpend, 9);
  assert.equal(r.grade, 'S'); // 12.43/9 ≈ 1.38 → S
});
test('evaluate: 습득 마법 구슬이 수지에 반영', () => {
  const r = C.evaluate({
    ...baseInput, mainJob: 'cleric', subJob: 'tailor', spells: ['리저렉트'], unspent: 51,
    stats: { STR: 12, AGR: 9, DEX: 6, INT: 15, VIT: 15, MEN: 15 },
  });
  assert.ok(r.ok, r.errors && r.errors.join(','));
  assert.equal(r.spellOrbs, 4);
  assert.equal(r.skillActual, 12); // 67 - 0 - 4 - 51
});
test('evaluate: vitals 결과와 초과 경고 포함', () => {
  const r = C.evaluate({ ...baseInput, vitals: { HP: 200, MP: 0, SP: 0 } });
  assert.ok(r.ok);
  assert.equal(r.vitals.length, 1);
  assert.ok(r.warnings.some((w) => w.includes('HP')));
});
test('evaluate: 리세마라 진단은 옵션 체크 시에만 포함', () => {
  const off = C.evaluate({ ...baseInput });
  assert.equal(off.reroll, null);
  const on = C.evaluate({ ...baseInput, rerollMode: true });
  assert.ok(on.reroll && typeof on.reroll.status === 'string');
});
test('evaluate: 기능 투자 없이 수지가 맞으면 HOLD', () => {
  const skills = Object.fromEntries(Object.keys(baseInput.skills).map((k) => [k, 1]));
  const r = C.evaluate({ ...baseInput, skills, unspent: 67 });
  assert.ok(r.ok);
  assert.equal(r.grade, 'HOLD');
});
test('evaluate: 획득량 초과 소비는 오류', () => {
  const r = C.evaluate({ ...baseInput, level: 2, stats: { STR: 20, AGR: 12, DEX: 15, INT: 10, VIT: 15, MEN: 10 } });
  assert.equal(r.ok, false);
});
test('evaluate: 검투사 + 연금술사 보조 가능 (제약 없음)', () => {
  const r = C.evaluate({ ...baseInput, mainJob: 'fighter', subJob: 'alchemist', stats: { STR: 15, AGR: 9, DEX: 9, INT: 9, VIT: 15, MEN: 15 } });
  assert.ok(r.ok);
});
test('subJobBlock: 빈 제약이면 자기 자신만 제외하고 전부 허용', () => {
  assert.deepEqual(C.GAME.subJobBlock, {});
  // 주직업과 보조직업이 같은 경우는 별도 규칙으로 계속 차단되어야 한다
  const same = C.evaluate({ ...baseInput, mainJob: 'warrior', subJob: 'warrior' });
  assert.equal(same.ok, false);
});
test('evaluate: 스팀판에 없는 보조직업(전사)은 오류', () => {
  const r = C.evaluate({ ...baseInput, subJob: 'warrior' });
  assert.equal(r.ok, false);
});
test('evaluate: 기본값 미만 스탯은 오류', () => {
  const r = C.evaluate({ ...baseInput, stats: { ...baseInput.stats, STR: 11 } });
  assert.equal(r.ok, false);
});
test('evaluate: 생성 배분(72) 모순 입력은 오류', () => {
  const r = C.evaluate({ ...baseInput, stats: { STR: 12, AGR: 6, DEX: 10, INT: 6, VIT: 6, MEN: 6 } }); // 합46 < 72
  assert.equal(r.ok, false);
});

// ============================================================
// 구슬 사용 시뮬레이터 (trainer.html)
// ============================================================
const trainerHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'trainer.html'), 'utf8');
const tData = trainerHtml.match(/<script id="trainer-data">([\s\S]*?)<\/script>/);
const tCore = trainerHtml.match(/<script id="trainer-core">([\s\S]*?)<\/script>/);
assert.ok(tData, 'trainer.html에서 trainer-data 블록을 찾지 못했습니다');
assert.ok(tCore, 'trainer.html에서 trainer-core 블록을 찾지 못했습니다');
const { D, T } = new Function(
  `${tData[1]}\n${tCore[1]}\n return { D: TRAINER_DATA, T: TrainerCore };`
)();

// --- index.html과 데이터 동기화 (build-trainer.mjs를 잊고 안 돌린 경우를 잡는다) ---
test('trainer 데이터: index.html의 성공률표와 일치', () => {
  assert.deepEqual(D.skillRatePct, C.GAME.skillRatePct);
});
test('trainer 데이터: index.html의 보장성 비용표와 일치', () => {
  assert.deepEqual(D.skillGuaranteedTiers, C.GAME.skillGuaranteedTiers);
});
test('trainer 데이터: 직업·보조직업 기능 목록이 index.html과 일치', () => {
  for (const [k, j] of Object.entries(C.GAME.jobs)) assert.deepEqual(D.jobs[k].skills, j.skills);
  for (const [k, j] of Object.entries(C.GAME.subJobs)) assert.deepEqual(D.subJobs[k].skills, j.skills);
  assert.deepEqual(D.subJobBlock, C.GAME.subJobBlock);
  assert.equal(D.skillMax, C.GAME.skillMax);
});

test('trainer 데이터: 모든 기능에 아이콘 인덱스가 있다', () => {
  const all = [...new Set(
    [...Object.values(C.GAME.jobs), ...Object.values(C.GAME.subJobs)].flatMap((j) => j.skills)
  )];
  const missing = all.filter((s) => D.iconIndex[s] == null);
  assert.deepEqual(missing, [], `아이콘 없는 기능: ${missing.join(', ')}`);
  // 스프라이트는 아이콘 22개가 가로로 이어붙은 374x18 이미지
  const idx = Object.values(D.iconIndex);
  assert.equal(new Set(idx).size, idx.length, '아이콘 인덱스가 중복됩니다');
  assert.ok(Math.max(...idx) < 22, '스프라이트 범위를 벗어난 인덱스가 있습니다');
});

// --- 성공률·비용 조회 ---
test('trainer: 성공률 경계값 (2=90%, 20=12%, 21=10%, 26=6%)', () => {
  assert.equal(T.stepInfo(D, 1).ratePct, 90);
  assert.equal(T.stepInfo(D, 19).ratePct, 12);
  assert.equal(T.stepInfo(D, 20).ratePct, 10);
  assert.equal(T.stepInfo(D, 25).ratePct, 6);
});
test('trainer: 보장성 비용 구간 (10=2, 15=3, 20=5, 25=10, 30=15)', () => {
  assert.equal(T.guaranteedCostAt(D, 10), 2);
  assert.equal(T.guaranteedCostAt(D, 15), 3);
  assert.equal(T.guaranteedCostAt(D, 20), 5);
  assert.equal(T.guaranteedCostAt(D, 25), 10);
  assert.equal(T.guaranteedCostAt(D, 30), 15);
});
test('trainer: 최대 레벨에서는 stepInfo가 null', () => {
  assert.equal(T.stepInfo(D, 30), null);
  assert.ok(T.stepInfo(D, 29));
});

// --- 확률성 판정 (난수 주입으로 결정적으로 검증) ---
test('trainer: 확률성은 난수가 성공률 미만이면 성공, 이상이면 실패', () => {
  const win = T.tryChance(D, 1, 10, () => 0.5);   // 목표 2레벨 = 90%
  assert.equal(win.ok, true);
  assert.equal(win.level, 2);
  assert.equal(win.spent, 1);

  const lose = T.tryChance(D, 1, 10, () => 0.95);
  assert.equal(lose.ok, false);
  assert.equal(lose.level, 1);   // 레벨 유지
  assert.equal(lose.spent, 1);   // 실패해도 구슬은 소모
});
test('trainer: 성공률 경계에서 난수가 정확히 같으면 실패 처리', () => {
  // 목표 21레벨 = 10% → rng 0.10은 실패, 0.09999는 성공
  assert.equal(T.tryChance(D, 20, 5, () => 0.1).ok, false);
  assert.equal(T.tryChance(D, 20, 5, () => 0.09999).ok, true);
});
test('trainer: 구슬이 없으면 확률성 불가', () => {
  assert.equal(T.tryChance(D, 1, 0, () => 0).error, 'orbs');
});
test('trainer: 최대 레벨에서는 훈련 불가', () => {
  assert.equal(T.tryChance(D, 30, 99, () => 0).error, 'max');
});
test('trainer: 시뮬레이터는 확률성만 실행한다 (보장성 실행 함수 없음)', () => {
  assert.equal(T.tryGuaranteed, undefined);
  // 다만 보장성 비용은 기대치 기준선 계산에 계속 쓰인다
  assert.equal(T.guaranteedCostAt(D, 21), 10);
});

// --- 캐릭터 레벨 상한 (기능 레벨은 캐릭터 레벨을 넘을 수 없다) ---
test('trainer: 상한은 기능 최대치와 캐릭터 레벨 중 낮은 쪽', () => {
  assert.equal(T.levelCap(D, 12), 12);
  assert.equal(T.levelCap(D, 50), D.skillMax);   // 캐릭터 레벨이 높아도 기능은 30까지
  assert.equal(T.levelCap(D, undefined), D.skillMax);
});
test('trainer: 캐릭터 레벨에 도달한 기능은 더 올릴 수 없다', () => {
  assert.equal(T.stepInfo(D, 12, 12), null);          // 12렙 캐릭터의 12렙 기능
  assert.ok(T.stepInfo(D, 11, 12));                   // 11 → 12는 가능
  assert.equal(T.tryChance(D, 12, 99, () => 0, 12).error, 'charLevel');
});
test('trainer: 상한 도달 오류는 기능 최대치와 캐릭터 레벨을 구분한다', () => {
  assert.equal(T.tryChance(D, 30, 99, () => 0, 99).error, 'max');
  assert.equal(T.tryChance(D, 20, 99, () => 0, 20).error, 'charLevel');
});
test('trainer: 캐릭터 레벨을 안 주면 기능 최대치까지 열려 있다 (자유 모드)', () => {
  assert.ok(T.stepInfo(D, 29));
  assert.equal(T.stepInfo(D, 30), null);
  assert.equal(T.tryChance(D, 25, 99, () => 0).ok, true);
});

// --- 기대 비용이 평가기 로직과 같은 기준인지 ---
test('trainer: 1→25 기대 비용이 평가기의 skillExpectedCost와 일치', () => {
  const mine = T.expectedCost(D, 1, 25);
  const theirs = C.skillExpectedCost({ a: 25 });
  assert.ok(Math.abs(mine - theirs) < 1e-9, `${mine} vs ${theirs}`);
});
test('trainer: 18레벨 구간은 확률성과 보장성 기댓값이 동률', () => {
  assert.equal(T.stepExpected(D, 18), 5);          // 1/0.20 === 5 === 보장성 5개
  assert.ok(T.stepExpected(D, 19) < 1 / T.rateAt(D, 19)); // 19부터는 보장성이 싸다
});

// --- 자동 굴리기가 구슬을 넘겨 쓰지 않는지 (루프 안전성) ---
test('trainer: 구슬만큼만 확률성을 시도할 수 있다', () => {
  let orbs = 3, level = 1, tries = 0;
  while (orbs > 0) {
    const r = T.tryChance(D, level, orbs, () => 0.99); // 항상 실패
    if (r.error) break;
    orbs -= r.spent; level = r.level; tries++;
  }
  assert.equal(tries, 3);
  assert.equal(orbs, 0);
  assert.equal(level, 1);
});

console.log(process.exitCode ? '\n일부 테스트 실패' : `\n전체 ${passed}개 테스트 통과`);
