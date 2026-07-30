// index.html의 GAME 상수에서 구슬 사용 시뮬레이터가 쓰는 부분만 뽑아 trainer.html에 주입한다.
// 게임 수치의 원본은 언제나 index.html 하나뿐이며, 여기서 복제본이 갈라지지 않도록 매번 재생성한다.
// index.html의 수치를 고쳤다면 실행: node tools/build-trainer.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'trainer.html');

const html = readFileSync(join(root, 'index.html'), 'utf8');
const core = html.match(/<script id="godius-core">([\s\S]*?)<\/script>/);
if (!core) {
  console.error('FAIL: index.html에서 godius-core 스크립트를 찾지 못했습니다');
  process.exit(1);
}
const C = new Function(`${core[1]}; return GodiusCalc;`)();
const G = C.GAME;

// assets/skill-icons.png의 가로 배열 순서. 공식 홈페이지 "기능 및 파라메터" 안내 이미지
// (godius.co.kr/h_info_1?t_id=2&part=11)에서 기능별 아이콘을 잘라 이어붙인 것이라
// 아래 순서를 바꾸면 스프라이트도 다시 만들어야 한다.
const ICON_ORDER = [
  '검술', '부술', '둔기술', '창술', '격술', '암살검술', '회피술', '함정발견', '해체술',
  '연막치기', '떨어뜨리기', '화염마법', '냉동마법', '중성마법', '신성마법',
  '옷제작', '옷수선', '무기제작', '무기수선', '화학', '응급처치', '주가',
];

const allSkills = [...new Set(
  [...Object.values(G.jobs), ...Object.values(G.subJobs)].flatMap((j) => j.skills)
)];
const missing = allSkills.filter((s) => !ICON_ORDER.includes(s));
if (missing.length) {
  console.error(`FAIL: 아이콘이 없는 기능 — ${missing.join(', ')}`);
  process.exit(1);
}

const data = {
  jobs: Object.fromEntries(
    Object.entries(G.jobs).map(([k, j]) => [k, { name: j.name, skills: j.skills }])
  ),
  subJobs: Object.fromEntries(
    Object.entries(G.subJobs).map(([k, j]) => [k, { name: j.name, skills: j.skills }])
  ),
  subJobBlock: G.subJobBlock,
  skillMax: G.skillMax,
  skillRatePct: G.skillRatePct,
  skillGuaranteedTiers: G.skillGuaranteedTiers,
  skillLevelReq: G.skillLevelReq,
  orbTable: G.orbTable,
  iconIndex: Object.fromEntries(ICON_ORDER.map((n, i) => [n, i])),
};

const block = `const TRAINER_DATA = ${JSON.stringify(data, null, 2)};`;

let out = readFileSync(file, 'utf8');
const re = /(\/\* GAMEDATA:START \*\/)[\s\S]*?(\/\* GAMEDATA:END \*\/)/;
if (!re.test(out)) {
  console.error('FAIL: trainer.html에서 GAMEDATA 마커를 찾지 못했습니다');
  process.exit(1);
}
out = out.replace(re, `$1\n${block}\n$2`);
writeFileSync(file, out);

const skillCount = new Set(
  [...Object.values(data.jobs), ...Object.values(data.subJobs)].flatMap((j) => j.skills)
).size;
console.log(
  `built trainer.html — 주직업 ${Object.keys(data.jobs).length}종 · 보조직업 ${Object.keys(data.subJobs).length}종 · 고유 기능 ${skillCount}종`
);
