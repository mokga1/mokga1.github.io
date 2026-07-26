// tools/monster-data.mjs의 사냥터 데이터로 guide/monsters.html의 표를 정적 HTML로 생성한다.
// 표를 JS로 그리면 검색엔진 크롤러가 내용을 읽지 못하므로 빌드 시점에 미리 박아 넣는다.
// 데이터를 고친 뒤 실행: node tools/build-monsters.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ZONES, D_ATK, D_WEAK } from './monster-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'guide', 'monsters.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderTier(tier) {
  return ZONES[tier].map(([name, lv, entry, mons]) => {
    const rows = mons.map(([n, atk, weak, magic]) =>
      `        <tr><td class="name">${esc(n)}</td>` +
      `<td class="tag-atk">${esc(atk || D_ATK)}</td>` +
      `<td class="tag-weak">${esc(weak || D_WEAK)}</td>` +
      `<td>${magic ? `<span class="tag-magic">${esc(magic)}</span>` : '—'}</td></tr>`
    ).join('\n');
    return [
      `      <div class="zone">`,
      `        <h3>${esc(name)} <span class="hint">(${esc(lv)})</span></h3>`,
      `        <p class="meta">${entry ? `입장 레벨: ${esc(entry)}` : '입장 제한 없음 (필드)'}</p>`,
      `        <table class="mon-table">`,
      `        <tr><th class="left">몬스터</th><th>속성 공격</th><th>속성 약점</th><th>마법</th></tr>`,
      rows,
      `        </table>`,
      `      </div>`,
    ].join('\n');
  }).join('\n');
}

let html = readFileSync(file, 'utf8');
let replaced = 0;

for (const tier of [1, 2, 3]) {
  const re = new RegExp(`(<!-- ZONES:${tier}:START -->)[\\s\\S]*?(<!-- ZONES:${tier}:END -->)`);
  if (!re.test(html)) {
    console.error(`FAIL: marker ZONES:${tier} not found in guide/monsters.html`);
    process.exitCode = 1;
    continue;
  }
  html = html.replace(re, `$1\n${renderTier(tier)}\n      $2`);
  replaced++;
}

if (replaced === 3) {
  writeFileSync(file, html);
  const zones = [1, 2, 3].reduce((n, t) => n + ZONES[t].length, 0);
  const mons = [1, 2, 3].reduce((n, t) => n + ZONES[t].reduce((m, z) => m + z[3].length, 0), 0);
  console.log(`built guide/monsters.html — ${zones} zones, ${mons} monster rows (static HTML)`);
}
