/* Mountweazel pages. Each entry on a word page pairs a real old word with a forged one; `realOn`
   says which proof, left or right (first or second on a phone), shows the real word. The real
   words grow rarer down the page, in bands from Familiar to All but lost. `scowl` records whether a
   real word is in the SCOWL lists of common English words (35, 40 or 50: the size of the smallest
   list it's in) or in none of them (null). check.js holds the rules every page must pass. */
'use strict';
const PAGES = [
  {
    number: 1,
    entries: [
      {
        band: 'Familiar',
        realOn: 'left',
        real: { word: 'popinjay', pos: 'n.', def: 'a parrot; a vain, chattering person.', scowl: 50,
          history: 'From Old French papejai, “parrot”, probably by way of Occitan from Arabic babghā’, an imitation of the bird. The parrot came first, in the 1300s; the vain person followed in the 1500s.',
          quote: { text: 'innumerable popingayes of sundry kindes are found chattering in the groves', cite: 'Richard Eden, 1555' } },
        fake: { word: 'gullfinch', pos: 'n.', def: 'a small finch; a simpleton.',
          anatomy: 'Invented on the pattern of bullfinch, which old slang really did use for a fool, with gull supplying the simpleton.' }
      },
      {
        band: 'Familiar',
        realOn: 'right',
        real: { word: 'pettifogger', pos: 'n.', def: 'a petty, quibbling lawyer.', scowl: 50,
          history: 'Petty plus fogger. Both senses have held for centuries: someone who raises petty objections, and a lawyer of the shabbier sort.',
          quote: { text: 'some political pettifogger skilled in delays, sophisms, and misapprehensions', cite: 'Washington Irving, 1809' } },
        fake: { word: 'pottlebelly', pos: 'n.', def: 'a pot-bellied drinker.',
          anatomy: 'Invented: pottle, an old half-gallon pot, plus belly. Shakespeare did write pottle, but never this.' }
      },
      {
        band: 'Familiar',
        realOn: 'right',
        real: { word: 'flibbertigibbet', pos: 'n.', def: 'a flighty, chattering person.', scowl: 50,
          history: 'Recorded from about 1450 as fleper-gebet, probably imitating idle chatter. Shakespeare made it the name of a fiend in King Lear, borrowed from Samuel Harsnett’s 1603 book exposing fake exorcisms.' },
        fake: { word: 'grizzlewit', pos: 'n.', def: 'a grey-headed fool.',
          anatomy: 'Invented: grizzle, grey hair, plus wit.' }
      },
      {
        band: 'Uncommon',
        realOn: 'left',
        real: { word: 'maunder', pos: 'v.', def: 'to babble, to ramble on.', scowl: 50,
          history: 'From an earlier maund, “to beg”, so first the whine of a beggar, then any aimless talk.',
          quote: { text: 'he briefly rallied, to maunder about many things', cite: 'Henry James, 1871' } },
        fake: { word: 'mumchatter', pos: 'v.', def: 'to mutter sulkily.',
          anatomy: 'Invented: mum, silent, plus chatter, two words pulling against each other.' }
      },
      {
        band: 'Uncommon',
        realOn: 'right',
        real: { word: 'mavis', pos: 'n.', def: 'a song thrush.', scowl: 50,
          history: 'Middle English mavys, from Old French mauvis, “song thrush”. Poets kept it long after everyone else had stopped.',
          quote: { text: 'The clear voiced mavis dwelleth', cite: 'Tennyson, 1830' } },
        fake: { word: 'merlehawk', pos: 'n.', def: 'a small moorland falcon.',
          anatomy: 'Invented: merle, a real old word for a blackbird, plus hawk. Bird names really are built this way, as in sparrowhawk, which is why it passes.' }
      },
      {
        band: 'Uncommon',
        realOn: 'left',
        real: { word: 'pelf', pos: 'n.', def: 'money, especially ill-gotten.', scowl: null,
          history: 'Late Middle English, once meaning booty or stolen goods, then money and riches. It may come from Anglo-Norman pelfre, “loot”, but its origin beyond that is uncertain.',
          quote: { text: 'Sirra, take up your pelfe, and be packing.', cite: 'Thomas Dekker, The Shoemaker’s Holiday, 1599' } },
        fake: { word: 'costerwain', pos: 'n.', def: 'a costermonger’s handcart.',
          anatomy: 'Invented: it borrows coster from costermonger and adds wain, an old word for a farm wagon. Leaning on a real word is a forger’s favourite trick.' }
      },
      {
        band: 'Rare',
        realOn: 'right',
        real: { word: 'fustilarian', pos: 'n.', def: 'a low, shabby fellow.', scowl: null,
          history: 'Falstaff’s insult, probably built on fusty, “mouldy”, and first recorded around 1600.',
          quote: { text: 'Away, you scullion! you rampallian! you fustilarian!', cite: 'Henry IV, Part 2' } },
        fake: { word: 'flouterkin', pos: 'n.', def: 'a pert young mocker.',
          anatomy: 'Invented: flouter, one who flouts, plus -kin. The real flounderkin, an old sneer at the Dutch, is a letter away.' }
      },
      {
        band: 'Rare',
        realOn: 'left',
        real: { word: 'grimalkin', pos: 'n.', def: 'an old she-cat; a spiteful old woman.', scowl: null,
          history: 'Usually explained as grey plus malkin, a pet form of Maud. The witch’s cat in Macbeth made it famous, though an earlier use exists, and some scholars suspect a French demon called Grimaud instead.',
          quote: { text: 'I come, Graymalkin!', cite: 'Macbeth' } },
        fake: { word: 'popingawk', pos: 'n.', def: 'a cuckoo; a gaping fool.',
          anatomy: 'Invented from popinjay and gawk. The cuckoo sense borrows from the real Scots gowk, a cuckoo or a fool.' }
      },
      {
        band: 'Rare',
        realOn: 'left',
        real: { word: 'mouldwarp', pos: 'n.', def: 'a mole.', scowl: null,
          history: 'Middle English moldewarpe, the “earth-thrower”: mould plus warp. German still calls the mole Maulwurf, and Danish muldvarp.' },
        fake: { word: 'farrowkin', pos: 'n.', def: 'a young pig.',
          anatomy: 'Invented: farrow, a litter of pigs, plus the diminutive -kin, as in lambkin.' }
      },
      {
        band: 'Obscure',
        realOn: 'right',
        real: { word: 'mammothrept', pos: 'n.', def: 'a spoiled child.', scowl: null,
          history: 'From Late Latin mammothreptus, “kept at the breast too long”, from Greek mammóthreptos, “brought up by one’s grandmother”.',
          quote: { text: 'O, you are a meere mammothrept in judgement, then.', cite: 'Ben Jonson, 1601' } },
        fake: { word: 'grumshaw', pos: 'n.', def: 'a sullen, surly fellow.',
          anatomy: 'Invented: grum, an old word for surly, with the ending of a surname like Grimshaw.' }
      },
      {
        band: 'Obscure',
        realOn: 'left',
        real: { word: 'gaberlunzie', pos: 'n.', def: 'a wandering beggar, especially a licensed one.', scowl: null,
          history: 'Scots, recorded from the 1500s. Licensed beggars were the King’s Bedesmen, called bluegowns after the blue gowns given them as alms. Where the word comes from is unknown; the guesses involve a cloak, a wallet and the loins.' },
        fake: { word: 'fardelman', pos: 'n.', def: 'a pedlar who carries his wares in a bundle.',
          anatomy: 'Invented: fardel, a bundle, plus man. A pedlar with a pack is easy to believe, which is the point.' }
      },
      {
        band: 'All but lost',
        realOn: 'right',
        real: { word: 'fleerish', pos: 'n.', def: 'a steel for striking sparks from a flint.', scowl: null,
          history: 'North-east Scots, recorded from 1700 to 1920, mostly in “flint an fleerish”. It is a worn-down form of Old Scots furisine, a “fire-iron”, with the fl- probably borrowed from flint. It sounds invented, but the Scottish National Dictionary has it.' },
        fake: { word: 'colewife', pos: 'n.', def: 'a woman who cries cabbages in the street.',
          anatomy: 'Invented: it joins cole, as in colewort, to wife in its old sense of “woman”, as in fishwife.' }
      }
    ]
  }
];
if (typeof module !== 'undefined' && module.exports) module.exports = PAGES;
