"""Rank candidate real words by how rare they are, to order the entries on a word page.
Height signals: membership of the local SCOWL lists (35, 40, 50: common words) and the usage
labels Wiktionary gives the word's English senses (archaic, obsolete, dialectal, rare...).

Usage: python3 tools/rarity.py words.json scowl_dir
  words.json  a JSON list of words, or verify.py's {"genuine": [...]} file; a file keeps them off the command line
  scowl_dir   a folder holding scowl-35.txt, scowl-40.txt and scowl-50.txt (from SCOWL, wordlist.aspell.net)
Prints one line per word and writes words-rarity.json beside the input."""
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
LABELS = ['obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'dialect', 'regional', 'Scotland', 'Northern England', 'poetic', 'literary', 'historical', 'nonce', 'slang', 'colloquial']


def fetch(url, tries=4):
    for attempt in range(tries):
        time.sleep(1.2 + 2 * attempt)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return e.code, ''
    return 429, ''


def english(page_html):
    m = re.search(r'<h2[^>]*id="English".*?(?=<h2|\Z)', page_html, re.S)
    if not m:
        return ''
    text = re.sub(r'<(style|script)[^>]*>.*?</\1>', ' ', m.group(0), flags=re.S)
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', text)))


def main(words_path, scowl_dir):
    words = json.load(open(words_path))
    if isinstance(words, dict):
        words = words.get('genuine', [])
    scowl = {}
    for size in (35, 40, 50):
        for line in open(f'{scowl_dir}/scowl-{size}.txt', encoding='utf-8', errors='replace'):
            w = line.strip().lower()
            if w and w not in scowl:
                scowl[w] = size
    out = {}
    for w in words:
        key = w.replace('-', '')
        size = scowl.get(w) or scowl.get(key)
        code, body = fetch(f'https://en.wiktionary.org/api/rest_v1/page/html/{w}')
        text = english(body) if code == 200 else ''
        found = sorted({lab for lab in LABELS if re.search(r'\(\s*[^)]*\b' + re.escape(lab) + r'\b[^)]*\)', text, re.I)})
        out[w] = {'scowl': size, 'labels': found, 'wiktionary': code}
        print(f'{w:16} scowl {size or "-":>3}  labels: {", ".join(found) or "-"}')
    json.dump(out, open(words_path.replace('.json', '-rarity.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
