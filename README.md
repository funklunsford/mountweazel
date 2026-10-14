# Mountweazel

A word puzzle in the newspaper, and you're the editor. Every entry on today's word page reaches your desk as two proofs, one real old word and one forgery; send the real word to press. Pass a forgery and it goes to press as an erratum, and the third erratum pulls the page. The words grow rarer down the page.

A *mountweazel* is a fake entry planted in a reference work. The name comes from Lillian Virginia Mountweazel, an invented person slipped into the 1975 New Columbia Encyclopedia.

> **Spoiler warning:** `pages.js` holds the answers.

## Play

Play it at **https://funklunsford.github.io/mountweazel/**, or open `index.html` in a browser. There's no build step and nothing to install.

- **You set the word page one entry at a time.** The current entry shows two proofs, A and B. Tap the one you think is real, or press ← or → on a keyboard. Both are then revealed: the real word's history, with a quotation where there is one, and how the forgery was made.
- **Next proof sets the entry.** The real word goes into the page in type, with the forgery struck out beneath it, a ✓ or ✗ in the margin and the history behind a History link.
- **A wrong pick goes to press as an erratum.** The page carries a note of it, and one of the three erratum boxes in the running head is struck. The third erratum pulls the page.
- **Bands of rarity divide the page:** Familiar (entries 1–3), Uncommon (4–6), Rare (7–9), Obscure (10–11) and All but lost (12). A band's heading lights up as you reach it.
- **At the end,** the Stop press box stamps the page passed for press or pulled, and gives you a grid to share (🟩 a real word set, 🟥 an erratum, ⬜ not set). If the page was pulled, the entries it never reached are filled in, greyed.

The browser keeps your progress, so a reload picks up where you left off.

Every merge to `main` runs `npm run check` and, if every page passes, publishes the site (`index.html`, `game.js`, `pages.js` and the images in `share/`) to GitHub Pages; see `.github/workflows/deploy.yml`. Pull requests are checked but not published.

## How a page is made

A page is data in `pages.js`: twelve entries, each with its band, a real word (part of speech, definition, history, perhaps a quotation, and how common it is), a forged one (part of speech, definition, and how it was made), and which proof shows the real word.

1. **Choose real words.** Put candidates in `candidates.json` as `{"genuine": [...]}` and run `python3 tools/verify.py candidates.json`. It prints Wiktionary's etymology and senses for each. Histories come from those sources and the dictionaries and works they cite, never from memory.
2. **Forge the fakes.** Put candidates in the same file as `{"fake": [...]}` and run the same script. A fake must be unknown to Wiktionary, to the Dictionaries of the Scots Language and to a web search; when DuckDuckGo blocks the script, it says NOT SEARCHED, and the search has to be done by hand. Several plausible candidates have failed, and two "fakes" turned out to be real Scots words. Keeping the words in a file keeps them off the command line.
3. **Rank by rarity.** `python3 tools/rarity.py candidates.json path/to/scowl` reports, for each real word, the smallest SCOWL list of common English it's in (35, 40 or 50) and the usage labels Wiktionary gives it. It reads the genuine words from the same file, and the folder needs `scowl-35.txt`, `scowl-40.txt` and `scowl-50.txt`, made from [SCOWL](http://wordlist.aspell.net). SCOWL membership is the only real measurement, and words in those lists go first. After them the order is a judgment: the labels count every sense of a word, and Scots-only words have no English labels at all.
4. **Pair them by shape.** Side by side, the two proofs should differ only in whether the word is real. Give them the same part of speech, the same number of senses and definitions of similar length, and never set a fake beside a real word it was built from.
5. **Check every page** with `npm run check`. It confirms that:
   - every entry has one real word with a history and one fake with an account of how it was made;
   - no word appears twice;
   - the two proofs of an entry match in part of speech, number of senses and rough length, and the fake doesn't lean on the real word beside it;
   - the real word is in proof A and proof B about equally often, and never in the same one more than three entries running;
   - the bands only get rarer down the page, from Familiar to All but lost, and every real word in SCOWL's lists comes before every real word in none of them.

There is one page so far, No. 1. Its words come from the deduction pages that came before it, so anyone who played those has met them.

## Earlier versions

Mountweazel began as a no-guess deduction page, modelled on [Clues by Sam](https://cluesbysam.com): a dictionary page with a few forged entries, where every genuine entry you verified gave a clue about the others. It played well, but it was a logic puzzle more than a word game. That version is in the git history, up to commit `1a08bf2`; the pairs replaced it.

## Share card

When the site's link is shared, previews show `share/card.png`: a 1200 × 630 front page with the nameplate and a plain statement of what the puzzle is. It shows no words from any page. `share/square.png` is a simpler square version, a blackletter M in a double-ruled frame with the name beneath, for apps that show square thumbnails. The M on its own makes the site's icons: `favicon.png` for the browser tab and `apple-touch-icon.png` for phone home screens.

The cards are drawn in `share/card.html` and `share/square.html`. After changing either, run `npm run share-card` and commit the PNGs. It renders them with headless Chrome (set `CHROME` to Chrome's path if it isn't in the usual macOS place) and shrinks the icons with macOS's `sips`. `index.html` carries the Open Graph and Twitter tags: the wide card comes first and the square card second. Their title and description say in words what the card shows.

## Credits

- The first, deduction version of Mountweazel was modelled on [Clues by Sam](https://cluesbysam.com).
- Word histories come from [Wiktionary](https://en.wiktionary.org) (CC BY-SA 4.0) and the [Dictionaries of the Scots Language](https://dsl.ac.uk). Quotations are from public-domain works. The fakes are invented.
- How common a word is comes from [SCOWL](http://wordlist.aspell.net), Kevin Atkinson's word lists.
- Fonts: UnifrakturMaguntia, Newsreader and Caveat, from Google Fonts under the SIL Open Font License.
