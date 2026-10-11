# Mountweazel

A dictionary page, set as a newspaper front page, with a few forged entries hidden among real archaic words. Find the forgeries by deduction: every page can be solved without guessing.

A *mountweazel* is a fake entry planted in a reference work. The name comes from Lillian Virginia Mountweazel, an invented person slipped into the 1975 New Columbia Encyclopedia.

> **Spoiler warning:** `pages.js` holds the answers.

## Play

Play it at **https://funklunsford.github.io/mountweazel/**, or open `index.html` in a browser. There's no build step and nothing to install.

Every merge to `main` runs `npm run check` and, if every page passes, publishes the page (`index.html`, `game.js`, `pages.js` and the link-preview image) to GitHub Pages; see `.github/workflows/deploy.yml`. Pull requests are checked but not published.

## Share card

When the site's link is shared, previews show `share/card.png`: a 1200 × 630 card with the nameplate and a plain statement of what the game is. It shows no words from any page. It's drawn in `share/card.html`; after changing that, run `npm run share-card`, which renders it with headless Chrome (set `CHROME` to Chrome's path if it isn't in the usual macOS place), and commit the PNG. `index.html` carries the Open Graph and Twitter tags that point to it, and their title and description say the same thing in words.

- One entry starts verified. Each genuine entry you verify opens with its real history and a note about the other entries.
- Tap an entry to call it genuine or fake. Tap the magnifying glass to mark a suspect while you think.
- A call your notes already prove scores ✓, a right call they don't prove yet is a hunch, and a wrong one is a mistake. Prove every call for a clean proof.
- Hint first tells you which notes to read together, then which entry they settle. Hardcore refuses calls the notes can't prove yet.

## How a page is made

A page is data in `pages.js`: its entries, which of them are fake, the starting entry, and one note per genuine entry. A note says how many fakes a group of entries holds, or compares two groups. The groups come from the entries themselves: their labels, what their definitions name, their first two letters, their place on the page, and their neighbours.

1. **Choose the words.** Put candidates in a JSON file (`{"genuine": [...], "fake": [...]}`) and run `python3 verify.py candidates.json`. For genuine words it prints Wiktionary's etymology and senses. For invented fakes it checks that Wiktionary, the Dictionaries of the Scots Language and a web search don't know them; several candidates have failed that check. Keeping the words in a file keeps them out of the command line, and so out of sight of anyone who'll play the page.
2. **Write the entries** into `pages.js`, with histories drawn from those sources.
3. **Generate the notes** with `node gen.js [page] [seed] [iterations] [restarts]`. It writes every true note it can, then searches for one note per genuine entry so the page can be solved without guessing at its level (`easy`, `medium` or `hard`), and writes them into `pages.js`.
4. **Check every page** with `npm run check`. It confirms:
   - every note is true;
   - exactly one answer fits, given the starting entry;
   - playing only provable calls finishes the page;
   - calling every entry genuine isn't a clean proof;
   - without the notes about meanings and spellings, the solve stalls.

   It also prints each page's difficulty.

The page itself and both scripts share one engine, in `game.js`, so the game's idea of a proven call and the checks can't drift apart.

## Difficulty

`check.js` measures difficulty as a profile: at each step of a solve, the fewest notes that, read together, settle an entry. A page of 1s is a chain of reveals, and a 3 is a real knot. The current page's profile is `1 2 2 3 2 2 1 1`: five of its eight steps need two notes or more, and one needs three.

## Credits

- The no-guess deduction of [Clues by Sam](https://cluesbysam.com) inspired the design.
- Word histories come from [Wiktionary](https://en.wiktionary.org) (CC BY-SA 4.0) and the [Dictionaries of the Scots Language](https://dsl.ac.uk). Quotations are from public-domain works. The fakes are invented for each page.
- Fonts: UnifrakturMaguntia, Newsreader and Caveat, from Google Fonts under the SIL Open Font License.
