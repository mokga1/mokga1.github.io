// 각 HTML 페이지의 <title>과 meta description을 읽어 Open Graph + canonical 태그를 삽입한다.
// 이미 og:url이 있는 파일은 건너뛰므로 여러 번 실행해도 안전하다.
// 실행: node tools/add-og.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://mokga1.github.io';

const pages = [
  'index.html', 'feedback.html', 'about.html', 'privacy.html',
  'guide/index.html', 'guide/monsters.html', 'guide/steam-differences.html',
  'guide/orbs.html', 'guide/beginner.html', 'guide/reroll.html',
  'guide/warrior.html', 'guide/fighter.html', 'guide/thief.html',
  'guide/wizard.html', 'guide/cleric.html',
];

for (const p of pages) {
  const file = join(root, p);
  let html = readFileSync(file, 'utf8');
  if (html.includes('property="og:url"')) { console.log(`skip (already tagged): ${p}`); continue; }

  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '가디우스 캐릭터 평가기';
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  const url = p === 'index.html' ? `${SITE}/`
    : p === 'guide/index.html' ? `${SITE}/guide/`
    : `${SITE}/${p}`;

  const tags = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="가디우스 캐릭터 평가기">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="ko_KR">`,
  ].join('\n');

  const anchor = /(<meta name="description"[^>]*>)/;
  if (!anchor.test(html)) { console.error(`FAIL (no description meta): ${p}`); process.exitCode = 1; continue; }
  html = html.replace(anchor, `$1\n${tags}`);
  writeFileSync(file, html);
  console.log(`tagged: ${p}`);
}
