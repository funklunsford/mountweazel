// Renders share/card.html to share/card.png (1200 × 630), the image link previews show.
// Uses headless Chrome; set CHROME to its path if it isn't in the usual macOS place.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const html = path.join(__dirname, 'card.html');
const png = path.join(__dirname, 'card.png');
// A throwaway profile, so the render never touches a Chrome you have open.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mountweazel-card-'));

try {
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=10000',
    `--user-data-dir=${profile}`,
    `--screenshot=${png}`,
    'file://' + html
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
} finally {
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(`Wrote ${path.relative(process.cwd(), png)}`);
