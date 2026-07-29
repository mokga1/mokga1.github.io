// index.html의 GAME 상수에서 훈련 시뮬레이터가 쓰는 부분만 뽑아 trainer.html에 주입한다.
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
