// 한국어 index.html에서 영어판 en/index.html을 생성한다.
// 번역 사전을 긴 문자열부터 치환하고, 번역되지 않은 한국어가 남은 줄(주석 제외)을 보고한다.
// 게임 수치가 바뀌어 index.html을 고치면 이 스크립트만 다시 실행하면 된다.
// 실행: node tools/build-en.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// [한국어 원문, 영어] — 적용 순서는 원문 길이 내림차순 (부분 문자열 충돌 방지)
const T = [
  // ── head ──
  ['<html lang="ko">', '<html lang="en">'],
  ['가디우스 캐릭터 육성 평가기', 'Godius Character Evaluator'],
  ['가디우스 캐릭터 평가기', 'Godius Character Evaluator'],
  ['가디우스(Godius Eternal War) 캐릭터가 잘 컸는지 힘의 구슬 수지로 진단합니다. 직업·레벨·파라메터·기능을 입력하면 S~F 등급과 리세마라 판정, HP/MP/SP 성장운까지 분석.',
   'Check whether your Godius Eternal War character was raised well. Enter job, level, parameters and skills to get an S-F grade, a reroll verdict, and HP/MP/SP growth-luck analysis.'],
  ['content="ko_KR"', 'content="en_US"'],
  ['rel="canonical" href="https://mokga1.github.io/"', 'rel="canonical" href="https://mokga1.github.io/en/"'],
  ['property="og:url" content="https://mokga1.github.io/"', 'property="og:url" content="https://mokga1.github.io/en/"'],

  // ── 헤더/네비게이션 ──
  ['GODIUS Eternal War — 힘의 구슬 수지로 내 캐릭터가 잘 컸는지 진단합니다',
   'GODIUS Eternal War — diagnose your character growth through the Orbs of Power ledger'],
  ['<a href="guide/">📚 공략 가이드</a>', '<a href="../">🇰🇷 한국어 (Korean version)</a>'],
  ['<a href="feedback.html">💬 피드백</a>', '<a href="../feedback.html">💬 Feedback</a>'],
  ['<a href="en/">🇺🇸 English</a>', ''],

  // ── 폼 섹션 ──
  [' 직업 선택</h2>', ' Job Selection</h2>'],
  ['<div class="field-label">주직업</div>', '<div class="field-label">Main Job</div>'],
  ['<div class="field-label">보조직업</div>', '<div class="field-label">Sub Job</div>'],
  [' 레벨 · HP / MP / SP</h2>', ' Level · HP / MP / SP</h2>'],
  ['현재 HP/MP/SP를 입력하면 레벨업 성장운이 평균 이상인지 진단합니다 (선택 입력, 장비·버프 보정 없는 순수 최대치 기준).',
   'Enter current HP/MP/SP to check whether your level-up growth luck is above average (optional; use raw max values without equipment or buffs).'],
  ['placeholder="미입력"', 'placeholder="optional"'],
  [' 현재 파라메터</h2>', ' Current Parameters</h2>'],
  ['주직업을 선택하면 생성 시 기본값으로 채워집니다. 스탯창의 현재 수치를 입력하세요.',
   'Selecting a main job pre-fills creation defaults. Enter the current values from your status window.'],
  [' 보유 기능 레벨</h2>', ' Skill Levels</h2>'],
  ['주직업·보조직업 조합에 따라 기능 목록이 표시됩니다. (생성 시 레벨 1부터 시작)',
   'The skill list follows your job combination. (All skills start at level 1 on creation)'],
  [' 습득한 마법 · 특수기술</h2>', ' Learned Spells · Special Skills</h2>'],
  ['배울 때 힘의구슬이 들어가는 것만 표시됩니다 (괄호 안이 소모 구슬). 란스만 드는 마법은 평가와 무관하여 제외.',
   'Only spells that cost Orbs of Power to learn are listed (cost in parentheses). Lance-only spells are omitted.'],
  ['미사용 힘의구슬 (캐릭터 선택 화면에서 확인)', 'Unspent Orbs of Power (shown on the character select screen)'],
  ['<b>리세마라 진단</b> — 지금 리세를 계속 진행할지, 삭제하고 다시 만들지 제안해줍니다 (목표: Lv50까지 기능 2개 25/25)',
   '<b>Reroll Check</b> — advises whether to keep going or delete and reroll (goal: two skills at 25/25 by Lv50)'],
  ['캐릭터 평가하기', 'Evaluate Character'],

  // ── 푸터 ──
  ['데이터 출처: ', 'Data: '],
  ['가디우스 공식 홈페이지', 'Godius Official Website'],
  ['스팀 공식 가이드', 'Official Steam Guides'],
  ['(기능 성공률표 · 마법 습득 비용 · 직업별 스킬)', '(success rates · spell costs · job skills)'],
  ['<a href="about.html">소개</a>', '<a href="../about.html">About</a>'],
  ['<a href="privacy.html">개인정보처리방침</a>', '<a href="../privacy.html">Privacy Policy</a>'],
  ['<a href="feedback.html">피드백</a>', '<a href="../feedback.html">Feedback</a>'],

  // ── GAME 데이터: 직업/기능/마법/스탯 ──
  ["name: '전사'", "name: 'Warrior'"],
  ["name: '검투사'", "name: 'Gladiator'"],
  ["name: '도둑'", "name: 'Thief'"],
  ["name: '마법사'", "name: 'Wizard'"],
  ["name: '성직자'", "name: 'Priest'"],
  ["name: '연금술사'", "name: 'Alchemist'"],
  ["name: '재봉사'", "name: 'Tailor'"],
  ["name: '대장장이'", "name: 'Blacksmith'"],
  ["name: '바드'", "name: 'Bard'"],
  ['암살검술', 'Assassin Sword'],
  ['검술', 'Sword Mastery'],
  ['부술', 'Axe Mastery'],
  ['둔기술', 'Blunt Mastery'],
  ['창술', 'Spear Mastery'],
  ['격술', 'Brawling'],
  ['회피술', 'Evasion'],
  ['함정발견', 'Detect Trap'],
  ['해체술', 'Disarm Trap'],
  ['연막치기', 'Smoke Screen'],
  ['떨어뜨리기', 'Stealing'],
  ['옷제작', 'Tailoring'],
  ['옷수선', 'Clothing Repair'],
  ['무기제작', 'Weapon Crafting'],
  ['무기수선', 'Weapon Repair'],
  ['화학', 'Chemistry'],
  ['응급처치', 'First Aid'],
  ['주가', 'Singing'],
  ['중성마법 (마법사)', 'Neutral Magic (Wizard)'],
  ['중성마법 (성직자)', 'Neutral Magic (Priest)'],
  ['특수기술 (전사)', 'Special (Warrior)'],
  ['특수기술 (검투사)', 'Special (Gladiator)'],
  ['화염마법', 'Fire Magic'],
  ['냉동마법', 'Ice Magic'],
  ['중성마법', 'Neutral Magic'],
  ['신성마법', 'Holy Magic'],
  ['피라볼', 'Firaball'],
  ['피라실드', 'Pyra Shield'],
  ['피라쇼크', 'Pyra Shock'],
  ['피라스트라이크', 'Pyra Strike'],
  ['파이어스톰', 'Firestorm'],
  ['아이겐볼', 'Eigen Ball'],
  ['아이겐실드', 'Eigen Shield'],
  ['아이겐웨이브', 'Eigen Wave'],
  ['아이겐스트라이크', 'Eigen Strike'],
  ['자이언트그로스', 'Giant Growth'],
  ['매지컬실드', 'Magical Shield'],
  ['위크니스', 'Weakness'],
  ['애시드클라우드', 'Acid Cloud'],
  ['메이지아머', 'Mage Armor'],
  ['바인드', 'Bind'],
  ['홀드', 'Hold'],
  ['큐어패럴라이즈', 'Cure Paralyze'],
  ['큐어디지즈', 'Cure Disease'],
  ['큐어펄스', 'Cure Pulse'],
  ['큐어', 'Cure'],
  ['블레스', 'Bless'],
  ['커스', 'Curse'],
  ['홀리볼', 'Holy Ball'],
  ['리저렉트', 'Resurrect'],
  ['파워실드', 'Power Shield'],
  ['실드블럭', 'Shield Block'],
  ['버서크', 'Berserk'],
  ["STR: 'STR (힘)'", "STR: 'STR (Strength)'"],
  ["AGR: 'AGR (민첩)'", "AGR: 'AGR (Agility)'"],
  ["DEX: 'DEX (손재주)'", "DEX: 'DEX (Dexterity)'"],
  ["INT: 'INT (지혜)'", "INT: 'INT (Wisdom)'"],
  ["VIT: 'VIT (활력)'", "VIT: 'VIT (Vitality)'"],
  ["MEN: 'MEN (정신력)'", "MEN: 'MEN (Mentality)'"],

  // ── 직업 육성 팁 ──
  ['생성 시 STR·VIT를 15에 맞추는 것이 공식 가이드 권장입니다.',
   'The official guide recommends setting STR and VIT to 15 at creation.'],
  ['구슬은 주무기 기능(검술/부술/둔기술 중 하나)에 집중하세요. 무기술 25부터 상위 기술이 열립니다.',
   'Focus your orbs on one weapon skill (sword, axe or blunt). Advanced techniques unlock from weapon skill 25.'],
  ['리뉴얼(자가 회복)은 무기술 25 + INT 15, 실드블럭은 무기술 25 + INT 25 + 구슬 5개가 필요하니 INT도 어느 정도 챙기면 좋습니다.',
   'Renewal (self-heal) needs weapon skill 25 + INT 15, and Shield Block needs weapon skill 25 + INT 25 + 5 orbs, so keep some INT.'],
  ['리세마라 정석: 주무기 기능 + 회피술 25/25.',
   'Reroll standard: main weapon skill + Evasion at 25/25.'],
  ['기본 STR12/VIT12라 6포인트만 쓰면 STR·VIT 15가 됩니다. 남는 보너스는 AGR·DEX에.',
   'With base STR 12 / VIT 12, only 6 points reach STR-VIT 15. Put the remaining bonus into AGR and DEX.'],
  ['다룰 수 있는 무기가 많지만 부술·둔기술·창술 중 하나만 집중하는 게 구슬 효율이 좋습니다.',
   'Many weapons are usable, but committing to just one of axe, blunt or spear is the orb-efficient path.'],
  ['창술 10 이상이면 스위핑블로우 2단 찌르기가 강화되고, 버서크는 무기술 25 + 구슬 5개가 필요합니다.',
   'Spear 10+ upgrades Sweeping Blow with a double thrust; Berserk needs weapon skill 25 + 5 orbs.'],
  ['명중(HC)은 DEX, 회피(DC)는 AGR — 생성 시 DEX·AGR 15 우선.',
   'DEX drives hit (HC) and AGR drives evasion (DC) — set both to 15 at creation.'],
  ['주력 딜은 암살검술입니다 (양손검 + 보강갑옷 이하 착용 조건, 검술보다 강력).',
   'Assassin Sword is your main damage (two-handed sword + reinforced armor or lighter; stronger than Sword Mastery).'],
  ['트랩설치는 해체술 15 + 함정발견 10, 플래시뱅은 연막치기 25가 필요합니다.',
   'Trap Setting needs Disarm Trap 15 + Detect Trap 10; Flashbang needs Smoke Screen 25.'],
  ['리세마라 정석: 암살검술 + 회피술 25/25.',
   'Reroll standard: Assassin Sword + Evasion at 25/25.'],
  ['생성 시 VIT·MEN·INT를 가급적 15에 맞추는 것이 공식 가이드 권장입니다.',
   'The official guide recommends VIT, MEN and INT at 15 on creation.'],
  ['화염·냉동 중 주력 원소 하나 + 중성마법 조합이 정석입니다. 판금 이상 갑옷을 입으면 마법을 못 쓰니 스태프류를 유지하세요.',
   'Standard build: one main element (fire or ice) plus neutral magic. Plate armor or heavier blocks casting, so stay on staves.'],
  ['고급 마법은 습득에도 구슬이 듭니다 (파이어스톰 5개, 피라쇼크 3개 등) — 리세 구간에는 아껴두세요.',
   'High-end spells cost orbs to learn (Firestorm 5, Pyra Shock 3, etc.) — hold off during the reroll phase.'],
  ['리세마라 정석: 주력 마법 2계열 25/25.',
   'Reroll standard: two main magic schools at 25/25.'],
  ['무기는 종교적 이유로 둔기류만 사용 가능 — 둔기술 + 신성마법이 주력입니다.',
   'Religious rules allow blunt weapons only — Blunt Mastery + Holy Magic is your core.'],
  ['파워실드(구슬 5개)는 파티 필수기라 습득 비용을 미리 계산에 넣어두세요.',
   'Power Shield (5 orbs) is a must-have party skill — budget for it in advance.'],
  ['리세마라 정석: 둔기술 + 신성마법 25/25.',
   'Reroll standard: Blunt Mastery + Holy Magic at 25/25.'],

  // ── 평가 로직 메시지 ──
  ['주직업을 선택하세요.', 'Select a main job.'],
  ['보조직업을 선택하세요.', 'Select a sub job.'],
  ['주직업과 보조직업은 같을 수 없습니다.', 'Main job and sub job cannot be the same.'],
  ['${job.name}은(는) 보조직업으로 ${sub.name}를 선택할 수 없습니다.', '${job.name} cannot take ${sub.name} as a sub job.'],
  ['레벨은 2~99 사이의 정수여야 합니다.', 'Level must be an integer between 2 and 99.'],
  ['${STAT_LABELS[k]}은(는) ${job.base[k]}~${GAME.statMax} 사이여야 합니다.', '${STAT_LABELS[k]} must be between ${job.base[k]} and ${GAME.statMax}.'],
  ['파라메터 입력이 생성 시 배분(합 ${GAME.totalInitial})과 모순됩니다. 현재 파라메터를 다시 확인하세요.',
   'Parameters contradict the creation allocation (total ${GAME.totalInitial}). Please re-check them.'],
  ['기능 [${name}] 레벨은 1~${GAME.skillMax} 사이여야 합니다.', 'Skill [${name}] must be between 1 and ${GAME.skillMax}.'],
  ['미사용 힘의구슬은 0 이상의 정수여야 합니다.', 'Unspent orbs must be an integer of 0 or more.'],
  ['획득 가능한 구슬(${earned}개)보다 많이 소비된 캐릭터입니다. 레벨·파라메터·습득 마법·미사용 구슬 입력을 확인하세요.',
   'This character spent more than the ${earned} orbs obtainable. Check level, parameters, learned spells and unspent orbs.'],
  ['기능 레벨 대비 소비한 구슬이 이론 최소보다 적습니다. 퀘스트·이벤트 등으로 구슬을 추가 획득한 것으로 보고 최상 효율로 평가합니다.',
   'Orbs spent are below the theoretical minimum for these skill levels. Assuming extra orbs from quests or events and rating at best efficiency.'],
  ['${v.key}가 기대 최대치(${v.max})보다 높습니다. 장비·버프 보정이 빠진 순수 수치인지 확인하세요.',
   '${v.key} is above the expected max (${v.max}). Make sure the value excludes equipment and buffs.'],
  ['${v.key}가 기대 최소치(${v.min})보다 낮습니다. 레벨·직업 입력을 확인하세요.',
   '${v.key} is below the expected min (${v.min}). Check the level and job inputs.'],
  ['이 주직업으로는 선택할 수 없는 보조직업입니다', 'Not selectable with this main job'],

  // ── 등급 카드 ──
  ['구슬의 신이 함께합니다. 완벽에 가까운 육성!', 'The orb gods are with you. Near-perfect growth!'],
  ['평균 이상의 운과 계획성. 아주 잘 컸습니다.', 'Above-average luck and planning. Very well raised.'],
  ['평균적인 유저 수준. 무난하게 잘 크고 있습니다.', 'Right around the average player. Growing steadily.'],
  ['기능 실패가 좀 있었네요. 평균에 약간 못 미칩니다.', 'Some failed training attempts. Slightly below average.'],
  ['구슬을 꽤 날렸습니다. 고레벨 기능은 보장성 훈련을 애용하세요.', 'Quite a few orbs burned. Use guaranteed training at high levels.'],
  ['기능 실패로 구슬을 갈아넣었습니다… 지금부터라도 보장성 위주로!', 'Orbs devoured by failed training… switch to guaranteed from now on!'],
  ["label: '보류'", "label: 'N/A'"],
  ['구슬 비축형 캐릭터. 아직 기능 투자가 없어 평가하기 이릅니다.', 'Orb stockpiler. No skill investment yet — too early to grade.'],

  // ── 리세마라 진단 ──
  ["['리세 성공', '기능 2개 25/25 달성! 이 캐릭터로 본육성을 진행하세요.']",
   "['Reroll Success', 'Two skills at 25/25! Keep this character and start the real grind.']"],
  ["['계속 진행 추천', '남은 구슬이 평균 기대치보다 많습니다. 삭제하지 말고 계속 키우세요.']",
   "['Keep Going', 'Remaining orbs exceed the expected cost. Do not delete — keep leveling.']"],
  ['평균 기대치보다 약 <b>${fmt(rr.expected - rr.available)}개</b> 부족합니다. 부족량이 적으면 도전해볼 만하지만, 크다면 지금 삭제하고 다시 만드는 게 시간 절약입니다.',
   'About <b>${fmt(rr.expected - rr.available)}</b> orbs short of the expected cost. A small gap is worth pushing through; a large one means rerolling now saves time.'],
  ["'판단 필요'", "'Decision Point'"],
  ["['삭제 후 재생성 추천', '레벨 50까지 남은 구슬을 전부 부어도 최소 필요량에 못 미칩니다. 이 캐릭터로는 25/25가 불가능해요.']",
   "['Delete and Reroll', 'Even spending every orb up to level 50 cannot reach the minimum needed. 25/25 is impossible on this character.']"],
  ['리세마라 진단은 레벨 50 이하에서만 제공됩니다.', 'The reroll check is only available at level 50 or below.'],
  ['🎲 시뮬레이션 10,000회: 목표 달성 확률 <b>', '🎲 Simulation (10,000 runs): success probability <b>'],
  ['(확률성 위주 진행, 여유가 생기면 보장성 마감 가정)', '(chance training first, switching to guaranteed once affordable)'],
  ["'1% 미만' : `약 ${pct}%`", "'under 1%' : `≈ ${pct}%`"],
  ['리세마라 진단 <span', 'Reroll Check <span'],
  ['기준: Lv${rr.targetLevel}까지 기능 2개 ${rr.goal}/${rr.goal} · 현재 상위 기능: ${topText}',
   'Goal: two skills at ${rr.goal}/${rr.goal} by Lv${rr.targetLevel} · current top skills: ${topText}'],
  ['남은 자원 <b>', 'Remaining <b>'],
  [' (레벨업 ${rr.future} + 보유 ${r.unspent})', ' orbs (from level-ups ${rr.future} + held ${r.unspent})'],
  ['/ 최소 필요 <b>', '/ minimum needed <b>'],
  ['/ 평균 기대 <b>', '/ expected <b>'],

  // ── 운 게이지 / 수지표 / 성장 진단 ──
  ['보장성을 잘 활용하는 합리적인 유저 대비 힘의구슬 약 <b>${fmt(diff)}개</b>를 절약했습니다.',
   'You saved about <b>${fmt(diff)}</b> orbs versus a rational player who uses guaranteed training optimally.'],
  ['보장성을 잘 활용하는 합리적인 유저 대비 힘의구슬 약 <b>${fmt(-diff)}개</b>를 더 소모했습니다.',
   'You overspent about <b>${fmt(-diff)}</b> orbs versus a rational player who uses guaranteed training optimally.'],
  ['운 게이지 (효율 지수 ', 'Luck Gauge (efficiency '],
  [' — 1.0이 평균)', ' — 1.0 = average)'],
  ['<span>허접</span><span>평균</span><span>괴수</span>', '<span>Unlucky</span><span>Average</span><span>Blessed</span>'],
  ['힘의 구슬 수지', 'Orbs of Power Ledger'],
  ['레벨업으로 획득한 구슬', 'Orbs earned from leveling'],
  ['파라메터에 사용 (실패 없음)', 'Spent on parameters (no failure)'],
  ['마법·특수기술 습득에 사용', 'Spent learning spells and skills'],
  ['미사용 보유 구슬', 'Unspent orbs held'],
  ['기능 훈련에 사용된 구슬 (추정)', 'Spent on skill training (estimated)'],
  ['기능 이론 최소 비용 (전부 1트 성공 시)', 'Theoretical minimum (every attempt succeeds)'],
  ['기능 평균 기대 비용 (확률성·보장성 중 유리한 쪽 선택 기준)', 'Expected cost (choosing chance vs guaranteed optimally)'],
  ['실패로 소실된 것으로 추정되는 구슬', 'Orbs likely lost to failures'],
  ['HP · MP · SP 성장 진단', 'HP · MP · SP Growth Check'],
  ['<th>항목</th>', '<th>Stat</th>'],
  ['<th>현재</th>', '<th>Current</th>'],
  ['<th>가능 범위 (Lv', '<th>Range (Lv'],
  ['<th>평균 대비</th>', '<th>vs Avg</th>'],
  ['<th>평균</th>', '<th>Average</th>'],
  ['<th>판정</th>', '<th>Verdict</th>'],
  ["['평균 이상', 'good']", "['Above average', 'good']"],
  ["['평균 수준', 'avg']", "['Average', 'avg']"],
  ["['평균 이하', 'bad']", "['Below average', 'bad']"],
  ["['범위 초과?', 'odd']", "['Above range?', 'odd']"],
  ["['범위 미달?', 'odd']", "['Below range?', 'odd']"],
  ['(상위 ', '(top '],
  ['* 레벨업 상승 범위는 커뮤니티 공략의 주직업 기준 수치이며, 보조직업 영향은 공식 미공개라 반영하지 않았습니다. 초기 스탯은 핵심 스탯 우선 배분으로 추정합니다.',
   '* Level-up growth ranges are community-sourced values for the main job; sub-job influence is not officially published. Initial stats are estimated with key-stat-first allocation.'],
  [' 육성 팁</h3>', ' Growth Tips</h3>'],
  ['* 기능 성공률·마법 습득 비용은 스팀 공식 가이드, 보장성 훈련 비용은 인게임 확인 수치 기준입니다.',
   '* Success rates and spell costs are from the official Steam guides; guaranteed training costs verified in game.'],
  ['기대 비용은 레벨 구간마다 확률성(1개, 실패 소실)과 보장성(확정 소모) 중 유리한 쪽을 선택한다고 가정합니다.',
   'Expected costs assume choosing whichever of chance training (1 orb, lost on failure) or guaranteed training is cheaper at each level.'],
  ['퀘스트·이벤트로 얻은 추가 구슬은 계산에 포함되지 않습니다.', 'Extra orbs from quests and events are not included.'],

  // ── 훈련 가이드 / 기타 UI ──
  ["chance: '확률성 유리'", "chance: 'Chance better'"],
  ["guaranteed: '보장성 유리'", "guaranteed: 'Guaranteed better'"],
  ["tie: '동률'", "tie: 'Tie'"],
  ['<b>훈련 방식 가이드</b> (목표 기능 레벨 기준) — ', '<b>Training Method Guide</b> (by target skill level) — '],
  ['동률 구간은 실패 위험이 없는 보장성을 추천합니다. 기대 비용 계산도 이 기준(유리한 쪽 선택)을 사용합니다.',
   'In tie ranges, guaranteed training is recommended (no failure risk). Expected costs use this optimal-choice baseline.'],
  [' 레벨업 1회당 상승 범위 — ', ' gains per level-up — '],
  ['stat-base">기본 ', 'stat-base">base '],
  ['이 레벨까지 레벨업으로 획득한 힘의구슬: ${earnedOrbs(lv)}개', 'Orbs of Power earned by this level: ${earnedOrbs(lv)}'],
  ['🔗 결과 공유 링크 복사', '🔗 Copy shareable result link'],
  ['✓ 복사 완료! 커뮤니티에 붙여넣어 보세요', '✓ Copied! Paste it anywhere'],
  ['주소창의 URL을 복사해서 공유하세요', 'Copy the URL from the address bar to share'],

  // ── 단위 정리 (인터폴레이션 뒤의 '개' 제거) — 반드시 문장 번역들보다 뒤에 적용됨 ──
  ['}개', '}'],
];

let html = readFileSync(join(root, 'index.html'), 'utf8');

// 길이 내림차순 적용 ('}개' 같은 짧은 규칙이 문장 규칙을 깨지 않도록)
const sorted = [...T].sort((a, b) => b[0].length - a[0].length);
let misses = 0;
for (const [ko, en] of sorted) {
  if (!html.includes(ko)) { console.warn(`  (not found) ${ko.slice(0, 60)}`); misses++; continue; }
  html = html.split(ko).join(en);
}

mkdirSync(join(root, 'en'), { recursive: true });
writeFileSync(join(root, 'en', 'index.html'), html);

// 번역 누락 검출: 주석 줄 제외하고 한글이 남은 줄 보고
const leftovers = [];
html.split('\n').forEach((line, i) => {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
  if (/[가-힣]/.test(line)) leftovers.push(`${i + 1}: ${t.slice(0, 90)}`);
});

console.log(`\nbuilt en/index.html (dictionary: ${T.length} entries, not-found: ${misses})`);
if (leftovers.length) {
  console.log(`\nKorean remaining on ${leftovers.length} non-comment lines:`);
  leftovers.forEach((l) => console.log('  ' + l));
} else {
  console.log('no Korean left outside comments ✓');
}
