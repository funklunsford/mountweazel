"""Check candidate words for a page without naming them on the command line.
Genuine candidates: print the English etymology and senses from Wiktionary.
Fake candidates: report whether Wiktionary, the Dictionaries of the Scots Language or a web search knows the word."""
import html
import json
import time
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def fetch(url, tries=4):
    for attempt in range(tries):
        time.sleep(1.5 + 2 * attempt)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return e.code, ''
    return 429, ''


def english_text(page_html):
    m = re.search(r'<h2[^>]*id="English".*?(?=<h2|\Z)', page_html, re.S)
    if not m:
        return ''
    section = re.sub(r'<(style|script)[^>]*>.*?</\1>', ' ', m.group(0), flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', section)
    text = html.unescape(re.sub(r'\s+', ' ', text)).strip()
    return text


def main(path):
    words = json.load(open(path))
    for w in words.get('genuine', []):
        code, body = fetch(f'https://en.wiktionary.org/api/rest_v1/page/html/{w}')
        text = english_text(body) if code == 200 else ''
        print(f'== {w} (wiktionary {code})')
        print('   ' + (text[:1400] if text else '(no English section)'))
    for w in words.get('fake', []):
        wcode, _ = fetch(f'https://en.wiktionary.org/api/rest_v1/page/html/{w}')
        dcode, dbody = fetch(f'https://dsl.ac.uk/results/{w}')
        dsl = 'no entry' if 'No results were found' in dbody else ('ENTRY OR CLOSE MATCH' if dcode == 200 else f'http {dcode}')
        wik = 'no entry' if wcode == 404 else f'EXISTS (http {wcode})'
        qcode, qbody = fetch('https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(f'"{w}"'))
        hits = len(re.findall(r'class="result__a"[^>]*>(?:(?!</a>).)*' + re.escape(w), qbody, re.I | re.S))
        snippets = len(re.findall(re.escape(w), re.sub(r'<input[^>]*>', '', qbody), re.I))
        if qcode != 200 or ('result__a' not in qbody and 'no-results' not in qbody):
            # DuckDuckGo sometimes answers with a bot challenge (often HTTP 202) instead of results: that proves nothing.
            web = f'NOT SEARCHED (http {qcode}, no results page; DuckDuckGo may have sent a challenge): search for it by hand'
        else:
            web = f'{hits} result titles and {snippets} mentions on the results page'
        print(f'== fake candidate {w}: wiktionary {wik}; DSL {dsl}; web {web}')


if __name__ == '__main__':
    main(sys.argv[1])
