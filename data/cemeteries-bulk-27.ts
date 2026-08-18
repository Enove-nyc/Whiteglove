// Bulk kevarim — batch 27. Four more directory towns, and the two best access
// notes of the whole run.
//
// Szerencs: the gate is padlocked and the combination is written on a board
// beside it, in Hebrew letters, to be read as numbers. Whoever set that up
// decided that anyone who can read the board belongs inside. That is worth a
// page on its own.
//
// CORRECTED AT BATCH 30. This file first said the sources could not settle
// whether the ohel's Reb Amram Billitzer and the kehilla's first rov were one
// man or two. A source found later gives both Billitzers with dates — the
// father 1834–1889, the son 1860–1913 — so they are one man and his son, and
// the entries below now say so.
//
// Brno: printed opening hours, seven days short of a Shabbos, and the tram
// that stops in front of the gate. Not one other listing on this site has
// opening hours, because almost nowhere in this part of the world still has a
// kehilla big enough to keep a cemetery open to the public.
//
// LEFT OUT OF BAIA MARE ON PURPOSE. Its survey is from April 2000 and names
// the private people living at and beside the cemetery — a widow in the house
// on the grounds, the neighbours who would translate, their church. Those are
// private individuals, the note is a quarter of a century old, and none of it
// belongs on a public page. What is kept is the street and the fact that
// somebody lives on the grounds.
//
// Cluj and Vitebsk were both researched for this batch and left out: nothing
// firm enough on either to send somebody with.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries27: Cemetery[] = [
  {
    slug: "szerencs-cemetery",
    city: "Szerencs",
    yiddishCity: "סערענטש",
    name: "Szerencs — the Jewish cemetery",
    yiddishName: "סערענטש — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Árpád hill, Szerencs, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.160, 21.203",
    arrivalNotes: [
      "THE PADLOCK'S COMBINATION IS WRITTEN ON THE GATE — IN HEBREW. The cemetery is up on Árpád hill and the gate is locked with a combination padlock. On a board beside it is the word for code in Hebrew letters, followed by four more Hebrew letters. Read them as numbers and that is the combination. No key, no keyholder, no telephone call.",
      "THE OHEL IS AT THE TOP OF THE HILL and it is kept in good order — swept, quiet, nothing like the rest of the ground.",
      "Outside the ohel expect long grass and matzevos worn thin by the weather. This is not a maintained cemetery; it is a maintained ohel in an unmaintained cemetery.",
      "Szerencs is in the Zemplén, so it comes on the same route as Tokaj, Bodrogkeresztúr, Mád and Ijhel rather than on its own.",
    ],
    burials: [
      {
        name: "Rabbi Amram Yishai HaLevi Billitzer",
        yiddishName: "רבי עמרם ישי הלוי ביליצער",
        knownAs: "First rov of Szerencs — in the ohel on Árpád hill",
        yahrzeit: "5649 / 1889",
        note: "1834–1889. Rov of the kehilla from 1864, and the founder of its yeshiva. Recorded in Hungarian spellings as Ámrám Jisáj and as Arman Billiczer, which is why an earlier version of this listing could not tell whether he and the kehilla's first rov were one man; a later source giving both with dates settled it. He is.",
      },
      {
        name: "Rabbi Pinchas HaLevi Billitzer",
        yiddishName: "רבי פנחס הלוי ביליצער",
        knownAs: "His son — rov of Szerencs after him, in the same ohel",
        yahrzeit: "5673 / 1913",
        note: "1860–1913. Followed his father as rov of Szerencs. The second of the two the ohel on Árpád hill stands over. Recorded in the Hungarian spelling Pinkász.",
      },
    ],
    sourceUrl: "https://zemplenizsidosag.hu/szerencs-en/",
  },
  {
    slug: "brno-cemetery",
    city: "Brno (Brünn)",
    yiddishCity: "ברין",
    name: "Brünn — the Jewish cemetery",
    yiddishName: "ברין — בית החיים",
    country: "Czech Republic",
    address: "Jewish cemetery, Nezamyslova 27, Židenice, Brno, South Moravian Region, Czech Republic",
    airportRef: "49.196, 16.641",
    arrivalNotes: [
      "IT HAS OPENING HOURS, which almost nothing else in this part of the world does. April to October: Sunday to Thursday nine to five, Friday nine to four. November to March: Sunday to Thursday nine to four, Friday nine to three. Closed Shabbos.",
      "Trams 8 and 10 from the main railway station stop in front of the gate. No car, no arrangement, no keyholder — you simply go.",
      "The largest Jewish cemetery in Moravia, just under three hectares, opened in 1852 when the laws that had kept Jews out of Brno were lifted. The kehilla publishes a printed guide to the ground with the notable kevorim marked; take it at the entrance.",
      "This is the cemetery of a city, not of a shtetl, and it is where the Jews of the Moravian towns were buried once those towns emptied. If you are travelling to Nikolsburg it is an hour away.",
    ],
    burials: [
      {
        name: "Rabbi Baruch Yaakov Placzek",
        yiddishName: "רבי ברוך יעקב פלאצעק",
        knownAs: "Chief rabbi of Moravia",
        yahrzeit: "5682 / 1922",
        note: "1834–1922. Chief rabbi of Moravia and one of the founders of this cemetery, which opened during his lifetime and in which he is buried.",
      },
      {
        name: "Rabbi Richard Feder",
        yiddishName: "רבי ריכארד פעדער",
        knownAs: "Rebuilt Moravian Jewish life after the war",
        note: "Survived the war and led the rebuilding of Jewish religious and communal life in Moravia afterwards. The kehilla's own guide records his as one of the most visited kevorim in the cemetery.",
      },
    ],
    sourceUrl: "https://www.jewishbrno.eu/zidovsky-hrbitov",
  },
  {
    slug: "baia-mare-cemetery",
    city: "Baia Mare (Nagybánya)",
    yiddishCity: "נאדבאניע",
    name: "Nagybánya — the Jewish cemetery",
    yiddishName: "נאדבאניע — בית החיים",
    country: "Romania",
    address: "Jewish cemetery, Strada Lebedei 27C, Baia Mare, Maramureș County, Romania",
    airportRef: "47.657, 23.585",
    arrivalNotes: [
      "STRADA LEBEDEI, AND THEN KEEP GOING. The cemetery is at the far end of the street, on the right. Number 27C is the address but the street runs on past the houses to reach it.",
      "SOMEBODY LIVES ON THE GROUNDS — there is a house on the site, occupied, which is how the cemetery has been kept. Knock rather than walking in as though it were empty.",
      "The surviving survey of this ground was made in April 2000 and nothing more recent was found. Twenty-five years is long enough for a caretaker's house to change hands, so treat the arrangements as needing to be remade rather than as standing.",
      "Baia Mare is the way into Maramureș from the west and is the town people sleep in before Sighet and the valley kevorim.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/baia-sprie-maramures-county",
  },
  {
    slug: "sambir-cemeteries",
    city: "Sambir (Sambor)",
    yiddishCity: "סאמבאר",
    name: "Sambor — the Jewish cemeteries",
    yiddishName: "סאמבאר — בתי החיים",
    country: "Ukraine",
    address: "Jewish cemeteries, Sambir, Lviv Oblast, Ukraine",
    airportRef: "49.518, 23.199",
    arrivalNotes: [
      "BOTH GROUNDS ARE GONE AS CEMETERIES. The old one was in use as far back as the sixteen hundreds and was demolished and built over in the Soviet period. The newer one appears on a nineteenth-century map and was used until the war, then destroyed after it.",
      "THE NEWER GROUND STILL EXISTS AS LAND, and it is hemmed in — the fences of the private houses around it now form its boundary. It is heavily overgrown and needs clearing before anyone could walk it.",
      "Do not confuse Sambir with Staryy Sambir. They are two towns about thirty kilometres apart and each has its own Jewish cemetery; navigation apps and surveys both mix them up.",
      "This is a page about what is there, not about a kever to stand at. If you are going, go knowing that.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/sambir-new-jewish-cemetery/",
  },
];
