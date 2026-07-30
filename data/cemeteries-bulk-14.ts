// Bulk kevarim — batch 14. Britain, which had none.
//
// Two London grounds, three centuries apart, and between them most of what
// there is to say about Anglo-Jewry: the mystic the Chassidishe world still
// comes to in the East End, and the Victorian cemetery where four Chief Rabbis
// and the Rothschilds lie in rows.
//
// IMPORTANT (safety): no grave GPS is invented. Navigate by the address, and
// confirm the stone on the ground.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries14: Cemetery[] = [
  {
    slug: "london-alderney-road",
    city: "London (Mile End)",
    yiddishCity: "לאָנדאָן",
    name: "Alderney Road — the oldest Ashkenazi bais hachaim in Britain",
    yiddishName: "לאָנדאָן — אַלדערני ראָוד",
    country: "United Kingdom",
    address: "Alderney Road Jewish Cemetery, Alderney Road, Mile End, London E1 4EG",
    arrivalNotes: [
      "Founded in 1696 by Benjamin Levy — the second oldest Jewish cemetery in London and the oldest Ashkenazi one in the country. It is the physical start of Ashkenazi Britain.",
      "The Baal Shem of London's kever is a large chest tomb and is the reason most people come. Chassidim have made it a place of pilgrimage, and the pebbles left on it are how you will recognise it.",
      "The gate is locked. It is a small walled ground in the middle of Mile End with no visitor facilities — arrange access through the United Synagogue rather than travelling out on spec.",
      "Mile End is East London, well served by the Underground, and a long way from the kosher food in Golders Green and Stamford Hill. Carry what you need.",
    ],
    accessNote:
      "Locked and not open to casual visitors. Access is arranged in advance through the United Synagogue's burial office. A small, uneven, historic ground.",
    burials: [
      {
        name: "Rabbi Chaim Shmuel Yaakov Falk",
        yiddishName: "רבי חיים שמואל יעקב פאלק",
        knownAs: "The Baal Shem of London",
        yahrzeit: "17 April 1782",
        note: "Kabbalist and baal shem, born about 1708 and settled in London, where his reputation as a worker of wonders reached well beyond the Jewish community. He left most of his wealth to Jewish charities and to shuls in his will, and was buried here on 18 April 1782. His chest tomb is still visited, and people still leave pebbles on it.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Alderney_Road_Cemetery",
  },
  {
    slug: "london-willesden",
    city: "London (Willesden)",
    yiddishCity: "לאָנדאָן",
    name: "Willesden — the United Synagogue cemetery",
    yiddishName: "לאָנדאָן — װילזדען",
    country: "United Kingdom",
    address: "Willesden Jewish Cemetery, Beaconsfield Road, Willesden, London NW10 2JE",
    arrivalNotes: [
      "Open since 1873, with close to thirty thousand people buried in it. This is where Victorian and modern Anglo-Jewry is, laid out in rows rather than crowded like the East End grounds.",
      "Four Chief Rabbis are here — Nathan Marcus Adler, his son Hermann Adler, Joseph Hertz and Israel Brodie — which makes it the single ground that holds the leadership of British Jewry across a century.",
      "The Rothschild family plot is here too, and the cemetery is a listed heritage site with a visitor centre; unlike Alderney Road it is set up for people to come.",
      "North-west London, and about twenty minutes from Golders Green — so it combines naturally with a stay in the Jewish quarter rather than needing a day of its own.",
    ],
    accessNote:
      "Open to visitors with a visitor centre, unlike most grounds on this site. Check the current opening days before travelling; it is a working cemetery and hours are not the same all week.",
    burials: [
      {
        name: "Rabbi Nathan Marcus Adler",
        yiddishName: "רבי נתן מרקוס אדלר",
        knownAs: "Chief Rabbi of the British Empire",
        note: "Chief Rabbi from 1845, and the man who founded the United Synagogue and Jews' College — the institutional shape of Anglo-Jewry is largely his.",
      },
      {
        name: "Rabbi Hermann Adler",
        yiddishName: "רבי הרמן אדלר",
        knownAs: "Chief Rabbi, 1891–1911",
        note: "Son of Nathan Marcus Adler and Chief Rabbi of the United Hebrew Congregations after him.",
      },
      {
        name: "Rabbi Joseph Herman Hertz",
        yiddishName: "רבי יוסף צבי הרץ",
        knownAs: "Chief Rabbi — the Hertz Chumash",
        seforim: "The Pentateuch and Haftorahs",
        note: "Chief Rabbi through both wars. The Hertz Chumash sat in nearly every English-speaking shul for two generations and is still on plenty of shelves.",
      },
      {
        name: "Rabbi Israel Brodie",
        yiddishName: "רבי ישראל ברודי",
        knownAs: "Chief Rabbi, 1948–1965",
        note: "Chief Rabbi through the post-war rebuilding of British Jewry.",
      },
    ],
    sourceUrl: "https://www.willesdenjewishcemetery.org.uk/willesden-jewish-cemetery",
  },
];
