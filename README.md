# Mountweazel

A climbing word game. Each of the twelve ledges up Mount Weazel shows two old words, one real and one forged; pick the real one to climb on. The real words grow rarer and stranger toward the summit. You carry three ropes, and each wrong pick cuts one.

A *mountweazel* is a fake entry planted in a reference work. The name comes from Lillian Virginia Mountweazel, an invented person slipped into the 1975 New Columbia Encyclopedia.

> **Spoiler warning:** `climbs.js` holds the answers.

## Play

Play it at **https://funklunsford.github.io/mountweazel/**, or open `index.html` in a browser. There's no build step and nothing to install.

- Tap the word you think is real, or press ← or → on a keyboard. Both cards then turn over: the real word's history, with a quotation where there is one, and how the forgery was made.
- A wrong pick cuts one of your three ropes, but you keep climbing. Lose the third and the climb ends where you stand.
- The ledges are a thousand feet apart, in camps: the Foothills (ledges 1–3), the Treeline (4–6), the Scree (7–9), the Ridge (10–11) and the Summit (12). Each camp has its own band of the mountain, and its name comes up as you reach it.
- A little scout climbs the switchback trail as you go, fixing an orange rope behind it. Ledges you got right are ticked, and ledges where a rope was cut are crossed and hatched.
- At the end you get a merit badge for the camp you reached, a grid to share (🟩 a right pick, 🟥 a rope cut, ⬜ not reached) and a log of all twelve ledges, with every reveal.

The browser keeps your progress, so a reload picks up where you left off.

Every merge to `main` runs `npm run check` and, if every climb passes, publishes the page (`index.html`, `climb.js`, `climbs.js` and the images in `share/`) to GitHub Pages; see `.github/workflows/deploy.yml`. Pull requests are checked but not published.

## How a climb is made

A climb is data in `climbs.js`: twelve ledges, each with its camp, a real word (part of speech, definition, history, perhaps a quotation, and how common it is), a forged one (part of speech, definition, and how it was made), and which side shows the real word.

1. **Choose real words.** Put candidates in `candidates.json` as `{"genuine": [...]}` and run `python3 tools/verify.py candidates.json`. It prints Wiktionary's etymology and senses for each. Histories come from those sources and the dictionaries and works they cite, never from memory.
2. **Forge the fakes.** Put candidates in the same file as `{"fake": [...]}` and run the same script. A fake must be unknown to Wiktionary, to the Dictionaries of the Scots Language and to a web search; when DuckDuckGo blocks the script, it says NOT SEARCHED, and the search has to be done by hand. Several plausible candidates have failed, and two "fakes" turned out to be real Scots words. Keeping the words in a file keeps them off the command line.
3. **Rank by rarity.** `python3 tools/altitude.py candidates.json path/to/scowl` reports, for each real word, the smallest SCOWL list of common English it's in (35, 40 or 50) and the usage labels Wiktionary gives it. It reads the genuine words from the same file, and the folder needs `scowl-35.txt`, `scowl-40.txt` and `scowl-50.txt`, made from [SCOWL](http://wordlist.aspell.net). SCOWL membership is the only real measurement, and words in those lists go lowest. Above them the order is a judgment: the labels count every sense of a word, and Scots-only words have no English labels at all.
4. **Pair them by shape.** Side by side, the two cards should differ only in whether the word is real. Give them the same part of speech, the same number of senses and definitions of similar length, and never set a fake beside a real word it was built from.
5. **Check every climb** with `npm run check`. It confirms that:
   - every ledge has one real word with a history and one fake with an account of how it was made;
   - no word appears twice;
   - the two cards on a ledge match in part of speech, number of senses and rough length, and the fake doesn't lean on the real word beside it;
   - the real word is on the left and the right about equally often, and never on one side more than three ledges running;
   - the camps follow the drawn mountain (Foothills 1–3, Treeline 4–6, Scree 7–9, Ridge 10–11, Summit 12), and every real word in SCOWL's lists comes before every real word in none of them.

There is one climb so far, No. 1. Its words come from the deduction pages that came before it, so anyone who played those has met them.

## Before the climb

Mountweazel began as a no-guess deduction page, modelled on [Clues by Sam](https://cluesbysam.com): a dictionary page with a few forged entries, where every genuine entry you verified gave a clue about the others. It played well, but it was a logic puzzle more than a word game, so the climb replaced it. That version is in the git history, up to commit `1a08bf2`.

## Share card

When the site's link is shared, previews show `share/card.png`: a 1200 × 630 card with the name, a plain statement of what the game is, and the page's mountain partway through a climb. It shows no words from any climb. `share/square.png` is a simpler square version, a gold summit badge with the name beneath, for apps that show square thumbnails. The site's icons are a sky tile with a white peak and an orange flag: `favicon.png` for the browser tab and `apple-touch-icon.png` for phone home screens. The mountain in `card.html` is the page's own drawing from `climb.js`, copied in as static SVG; if the drawing changes, copy it again.

The cards are drawn in `share/card.html` and `share/square.html`. After changing either, run `npm run share-card` and commit the PNGs. It renders them with headless Chrome (set `CHROME` to Chrome's path if it isn't in the usual macOS place) and shrinks the icons with macOS's `sips`. `index.html` carries the Open Graph and Twitter tags: the wide card comes first and the square card second. Their title and description say in words what the card shows.

## Credits

- The look takes its inspiration from [PEAK](https://store.steampowered.com/app/3527290/PEAK/), the co-op climbing game by Aggro Crab and Landfall: pastel skies, chunky outlined lettering, scouts and merit badges, and a stamina bar with hatched segments.
- The first, deduction version of Mountweazel was modelled on [Clues by Sam](https://cluesbysam.com).
- Word histories come from [Wiktionary](https://en.wiktionary.org) (CC BY-SA 4.0) and the [Dictionaries of the Scots Language](https://dsl.ac.uk). Quotations are from public-domain works. The fakes are invented.
- How common a word is comes from [SCOWL](http://wordlist.aspell.net), Kevin Atkinson's word lists.
- Fonts: Lilita One and Rubik, from Google Fonts under the SIL Open Font License.
