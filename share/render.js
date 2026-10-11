// Renders the link-preview images and the site's icons with headless Chrome:
//   card.html          -> card.png (1200 × 630), the wide preview
//   square.html        -> square.png (1200 × 1200), the square preview
//   square.html#mark   -> apple-touch-icon.png (180 × 180) and favicon.png (64 × 64), shrunk with sips
// Set CHROME to Chrome's path if it isn't in the usual macOS place. sips ships with macOS.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// A throwaway profile and scratch folder, so rendering never touches a Chrome you have open.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'mountweazel-card-'));
const here = file => path.join(__dirname, file);
const wrote = file => console.log(`Wrote ${path.relative(process.cwd(), file)}`);

function render(page, out, width, height) {
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${width},${height}`,
    '--virtual-time-budget=10000',
    `--user-data-dir=${path.join(scratch, 'profile')}`,
    `--screenshot=${out}`,
    'file://' + page
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
}

function shrink(from, out, size) {
  execFileSync('sips', ['-z', String(size), String(size), from, '--out', out], { stdio: 'ignore' });
}

try {
  render(here('card.html'), here('card.png'), 1200, 630);
  wrote(here('card.png'));
  render(here('square.html'), here('square.png'), 1200, 1200);
  wrote(here('square.png'));
  const mark = path.join(scratch, 'mark.png');
  render(here('square.html') + '#mark', mark, 1200, 1200);
  shrink(mark, here('apple-touch-icon.png'), 180);
  wrote(here('apple-touch-icon.png'));
  shrink(mark, here('favicon.png'), 64);
  wrote(here('favicon.png'));
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
