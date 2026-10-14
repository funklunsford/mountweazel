/* Mountweazel pages. gen.js writes the notes and starting entry of generated pages. */
'use strict';
const PAGES = [
  {
    "number": 3,
    "letters": "M",
    "level": "medium",
    "fakes": 3,
    "start": "mammothrept",
    "entries": [
      {
        "id": "malkin",
        "word": "malkin",
        "pos": "n.",
        "label": "dialect",
        "kinds": [
          "person"
        ],
        "def": "a slattern, a kitchen maid; a mop for a baker’s oven.",
        "history": "From Malde, an early form of Maud or Matilda, plus -kin. A stock name for a kitchen maid or a slattern since the 1200s; the oven mop followed in the 1400s."
      },
      {
        "id": "mammock",
        "word": "mammock",
        "pos": "n.",
        "label": "origin unknown",
        "kinds": [],
        "def": "a scrap, a shapeless piece.",
        "history": "Mam, of obscure origin, plus the diminutive -ock. Now heard only in dialect.",
        "quote": {
          "text": "Let me be torn into mammocks with wild Bears",
          "cite": "John Day, 1600"
        }
      },
      {
        "id": "mammothrept",
        "word": "mammothrept",
        "pos": "n.",
        "label": null,
        "kinds": [
          "person"
        ],
        "def": "a spoiled child.",
        "history": "From Late Latin mammothreptus, “kept at the breast too long”, from Greek mammóthreptos, “brought up by one’s grandmother”.",
        "quote": {
          "text": "O, you are a meere mammothrept in judgement, then.",
          "cite": "Ben Jonson, 1601"
        }
      },
      {
        "id": "maunder",
        "word": "maunder",
        "pos": "v.",
        "label": null,
        "kinds": [],
        "def": "to babble, to ramble on.",
        "history": "From an earlier maund, “to beg”, so first the whine of a beggar, then any aimless talk.",
        "quote": {
          "text": "he briefly rallied, to maunder about many things",
          "cite": "Henry James, 1871"
        }
      },
      {
        "id": "mavis",
        "word": "mavis",
        "pos": "n.",
        "label": "poetic",
        "kinds": [
          "animal"
        ],
        "def": "a song thrush.",
        "history": "Middle English mavys, from Old French mauvis, “song thrush”. Poets kept it long after everyone else had stopped.",
        "quote": {
          "text": "The clear voiced mavis dwelleth",
          "cite": "Tennyson, 1830"
        }
      },
      {
        "id": "merlehawk",
        "word": "merlehawk",
        "pos": "n.",
        "label": "dialect",
        "kinds": [
          "animal"
        ],
        "fake": true,
        "def": "a small moorland falcon.",
        "anatomy": "Invented for this page: merle, a real old word for a blackbird, plus hawk. Bird names really are built this way, as in sparrowhawk, which is why it passes."
      },
      {
        "id": "merrythought",
        "word": "merrythought",
        "pos": "n.",
        "label": null,
        "kinds": [],
        "def": "a wishbone.",
        "history": "Merry plus thought, traditionally for the pleasant thoughts imagined as the bone is broken.",
        "quote": {
          "text": "a bone, which we call the Merry thought",
          "cite": "Randle Holme, 1688"
        }
      },
      {
        "id": "mouldwarp",
        "word": "mouldwarp",
        "pos": "n.",
        "label": "dialect",
        "kinds": [
          "animal"
        ],
        "def": "a mole.",
        "history": "Middle English moldewarpe, the “earth-thrower”: mould plus warp. German still calls the mole Maulwurf, and Danish muldvarp."
      },
      {
        "id": "mulligrubs",
        "word": "mulligrubs",
        "pos": "n.",
        "label": "origin unknown",
        "kinds": [],
        "def": "a stomach ache; a fit of the sulks.",
        "history": "From the 1500s, origin unknown; perhaps mull, “dirt”, plus grub. First the colic, then sullenness and low spirits."
      },
      {
        "id": "mumchatter",
        "word": "mumchatter",
        "pos": "v.",
        "label": "origin unknown",
        "kinds": [],
        "fake": true,
        "def": "to mutter sulkily.",
        "anatomy": "Invented for this page: mum, silent, plus chatter, two words pulling against each other. Forgers love the “origin unknown” label because it needs no evidence."
      },
      {
        "id": "mumpsimus",
        "word": "mumpsimus",
        "pos": "n.",
        "label": null,
        "kinds": [
          "person"
        ],
        "def": "one who clings to an error after it is corrected; the error itself.",
        "history": "From the story of a priest who misread sumpsimus, “we have taken”, as mumpsimus, and refused to change it when corrected. Tyndale used it in 1530; the tale is credited to Richard Pace or Erasmus."
      },
      {
        "id": "muzzlefog",
        "word": "muzzlefog",
        "pos": "n.",
        "label": "poetic",
        "kinds": [],
        "fake": true,
        "def": "a damp, choking mist.",
        "anatomy": "Invented for this page: muzzle plus fog, built to sound like a lost weather word."
      }
    ],
    "notes": {
      "malkin": {
        "text": "More of the four entries that begin with MU are fakes than of the five entries that begin with MA.",
        "kind": "spelling",
        "type": "compare",
        "a": [
          "mulligrubs",
          "mumchatter",
          "mumpsimus",
          "muzzlefog"
        ],
        "b": [
          "malkin",
          "mammock",
          "mammothrept",
          "maunder",
          "mavis"
        ],
        "rel": "more"
      },
      "mammock": {
        "text": "At least one of the three entries whose definitions name an animal is a fake.",
        "kind": "meaning",
        "set": [
          "mavis",
          "merlehawk",
          "mouldwarp"
        ],
        "fakes": [
          1,
          2,
          3
        ]
      },
      "mammothrept": {
        "text": "None of the three entries whose definitions name a person is a fake.",
        "kind": "meaning",
        "set": [
          "malkin",
          "mammothrept",
          "mumpsimus"
        ],
        "fakes": [
          0
        ]
      },
      "maunder": {
        "text": "At least one of the two entries labelled poetic is a fake.",
        "kind": "label",
        "set": [
          "mavis",
          "muzzlefog"
        ],
        "fakes": [
          1,
          2
        ]
      },
      "mavis": {
        "text": "Exactly one of my two neighbours is a fake.",
        "kind": "position",
        "set": [
          "maunder",
          "merlehawk"
        ],
        "fakes": [
          1
        ]
      },
      "merrythought": {
        "text": "At least one of the first six entries on the page is a fake.",
        "kind": "position",
        "set": [
          "malkin",
          "mammock",
          "mammothrept",
          "maunder",
          "mavis",
          "merlehawk"
        ],
        "fakes": [
          1,
          2,
          3,
          4,
          5,
          6
        ]
      },
      "mouldwarp": {
        "text": "The first six entries on the page hold as many fakes as the two entries marked v.",
        "kind": "meaning",
        "type": "compare",
        "a": [
          "malkin",
          "mammock",
          "mammothrept",
          "maunder",
          "mavis",
          "merlehawk"
        ],
        "b": [
          "maunder",
          "mumchatter"
        ],
        "rel": "same"
      },
      "mulligrubs": {
        "text": "At most one of the two entries labelled poetic is a fake.",
        "kind": "label",
        "set": [
          "mavis",
          "muzzlefog"
        ],
        "fakes": [
          0,
          1
        ]
      },
      "mumpsimus": {
        "text": "Exactly one of the three entries labelled origin unknown is a fake.",
        "kind": "label",
        "set": [
          "mammock",
          "mulligrubs",
          "mumchatter"
        ],
        "fakes": [
          1
        ]
      }
    }
  }
];
if (typeof module !== 'undefined' && module.exports) module.exports = PAGES;
