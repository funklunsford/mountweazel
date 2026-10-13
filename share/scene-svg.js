// Draws the page's mountain (SCENE in climb.js) into card.html as static SVG, partway through a
// climb, so the share card shows the page's own scene. `npm run share-card` runs it before rendering.
//   node share/scene-svg.js [ledges climbed] [ledges where a rope was cut, comma-separated]
// The defaults, 7 and 2,5, show a scout on the Scree with two crossed ledges below it.
'use strict';
const fs = require('fs');
const path = require('path');
const { SCENE } = require('../climb.js');

const climbed = Number(process.argv[2] ?? 7);
const cut = new Set(String(process.argv[3] ?? '2,5').split(',').filter(Boolean).map(Number));
if (!Number.isInteger(climbed) || climbed < 0 || climbed > SCENE.ledgeAt.length) {
  console.error(`Ledges climbed must be a whole number from 0 to ${SCENE.ledgeAt.length}.`);
  process.exit(1);
}

const points = ps => ps.map(p => p.join(',')).join(' ');
const route = points([SCENE.base, ...SCENE.ledgeAt.slice(0, climbed)]);
const [x, y] = climbed ? SCENE.ledgeAt[climbed - 1] : SCENE.base;
let ledge = 0;

// The page sets these as you climb; here they're set once, for a still picture.
function pose([tag, attrs, kids]) {
  const cls = String(attrs.class || '');
  const a = { ...attrs };
  if (cls === 'marker') {
    ledge++;
    if (ledge <= climbed) a.class = cut.has(ledge) ? 'marker wrong' : 'marker right';
  }
  if (cls.startsWith('rope-line')) a.points = route;
  if (cls === 'climber') a.transform = `translate(${x} ${y - 6})`;
  return [tag, a, kids.filter(([, k]) => k.class !== 'halo' && k.class !== 'star').map(pose)];
}

const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const markup = ([tag, attrs, kids]) => {
  const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  return kids.length ? `<${tag}${a}>${kids.map(markup).join('')}</${tag}>` : `<${tag}${a}/>`;
};

const svg = pose(['g', {}, SCENE.tree()])[2].map(markup).join('\n');
const card = path.join(__dirname, 'card.html');
const html = fs.readFileSync(card, 'utf8');
const block = /(<!-- scene: written by share\/scene-svg\.js -->\n)[\s\S]*?(\n<!-- \/scene -->)/;
if (!block.test(html)) {
  console.error('card.html has no scene markers to write between.');
  process.exit(1);
}
fs.writeFileSync(card, html.replace(block, (_, open, close) => open + svg + close));
console.log(`Wrote the scene into ${path.relative(process.cwd(), card)}: ${climbed} ledges climbed, ropes cut on ${[...cut].join(', ') || 'none'}`);
