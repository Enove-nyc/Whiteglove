// Bulk kevarim — batch 24. Four more directory towns, and a better batch than
// the last few: three of the four have an ohel standing on the ground.
//
// What these four have in common is that somebody went back for the stones.
// Rohatyn's matzevos were dug out of a Gestapo courtyard where they had been
// laid as paving; Płock's rov was dug up under the occupation, wrapped in a
// tallis and reburied with the burnt sifrei Torah in the other cemetery;
// Żelechów's ground was fenced again in 2014 and two ohels put up over it.
// Where the towns of batch 22 had nothing but a street name, these have a
// history of recovery, and that is what the pages say.
//
// NAMES HELD BACK, as always. Rohatyn's ohel is described by the people who
// rebuilt it as commemorating three of the Stratyner rabbonim without naming
// which three, so this listing does not name them either. Żelechów's ohel is
// described by its surveyors as standing over the LIKELY burial places of the
// two men named on it — the page keeps that word.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries24: Cemetery[] = [
  {
    slug: "zelechow-cemetery",
    city: "Żelechów",
    yiddishCity: "זעליחוב",
    name: "Żelechów — the Jewish cemetery",
    yiddishName: "זעליחוב — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, in the woods between Reymonta, Brzóski, Bema and Chłopickiego, Żelechów, Masovian Voivodeship, Poland",
    airportRef: "51.813, 21.897",
    arrivalNotes: [
      "IT IS IN THE TREES, in the south-western corner of the town, on about two hectares bounded by Reymonta, Brzóski, Bema and Chłopickiego. There is a mesh fence two metres high and a gate; the fence has damaged sections, but the gate is the way in.",
      "TWO OHELS STAND HERE. The block-built one is over the likely kevorim of Reb Aharon Yechiel of the Kozhnitzer line and Reb Aharon HaKohen. The second is only a wooden roof on posts, sheltering two old matzevos brought in from the ground — one of them of Sheindel Freida Rabinowicz, the wife of the Yid HaKadosh of Peshischa.",
      "Around seventy whole matzevos are left, plus fragments. The oldest readable is from 1847 and the last from the nineteen-thirties, so the cemetery's first forty years are gone from the stones entirely.",
      "The ground was used for killings and for burying the dead of the ghetto during the war, and then left until 2014, when it was fenced and the ohels were built. Expect long grass.",
      "Reb Levi Yitzchok was the rov of Żelechów before Berditchev, and people ask. He is not buried here — his kever is in Berditchev, in Ukraine.",
    ],
    burials: [
      {
        name: "Rabbi Aharon Yechiel Hopstein",
        yiddishName: "רבי אהרן יחיאל האפשטיין",
        knownAs: "Of the Kozhnitzer line",
        note: "The survey of this cemetery gives him as one of the two men the block ohel stands over, and says likely rather than certain. Recorded there in the Polish spelling Aron Jechiel, with 1941.",
      },
      {
        name: "Rabbi Aharon HaKohen",
        yiddishName: "רבי אהרן הכהן",
        note: "Named with him as the second of the two the ohel commemorates. The survey does not date him and neither does this listing.",
      },
    ],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/zelechow-new-jewish-cemetery/",
  },
  {
    slug: "rohatyn-cemeteries",
    city: "Rohatyn",
    yiddishCity: "ראהאטין",
    name: "Rohatyn — the Jewish cemeteries",
    yiddishName: "ראהאטין — בתי החיים",
    country: "Ukraine",
    address: "Old Jewish cemetery, on the hill off S. Bandera Street, Rohatyn, Ivano-Frankivsk Oblast, Ukraine",
    airportRef: "49.409, 24.610",
    arrivalNotes: [
      "TWO GROUNDS. The old one is on a hilltop off S. Bandera Street, with houses grown up around it; the newer one is at the northern edge of the town and was opened when the old ground filled before the war.",
      "The old cemetery is fenced with metal pickets on a concrete base, put up in 1998 and rusting since, and its gates are gone — so it is open. Signage was put up in 2023 explaining what the site is.",
      "AN OHEL WAS REBUILT HERE for three of the Stratyner rabbonim of Rohatyn. The people who rebuilt it do not say in public which three, so this listing does not name them.",
      "THE STONES CAME BACK FROM THE TOWN'S PAVEMENTS. Over five hundred matzevos and fragments have been recovered since 2011 — including a large pile taken out of the courtyard of the former Gestapo headquarters, where they had been laid end to end as paving for vehicles. On the ruling of the rov of Ivano-Frankivsk they were all returned to the old cemetery, and a memorial is being built to display them.",
      "The ground is cleared of undergrowth once a year. Between clearings it grows over, so what you find underfoot depends on the season.",
    ],
    burials: [],
    sourceUrl: "https://rohatynjewishheritage.org/en/projects/old-jewish-cemetery/",
  },
  {
    slug: "plock-cemetery",
    city: "Płock",
    yiddishCity: "פלוצק",
    name: "Płock — the Jewish cemetery",
    yiddishName: "פלוצק — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, ulica Mickiewicza, Płock, Masovian Voivodeship, Poland",
    airportRef: "52.546, 19.706",
    arrivalNotes: [
      "THE OLD CEMETERY IS GONE AND IS NOT WHERE YOU GO. It was bought as a garden around 1570 and took its last burial in 1850; after the war the ground was given over for building, and a park and a high school dormitory stand on it. One piece of its wall survives by the crossing on Padlewskiego, with a mural painted on it in 2018.",
      "The cemetery to go to is on Mickiewicza, about a kilometre and a half north-east of the old market square, opened 1845 and in use until 1968. It is fenced, the gate does not lock, and anyone may walk in.",
      "EXPECT AN EMPTY FIELD. It is three point two hectares — the same size it was before the war — and about ten matzevos are left standing on the whole of it.",
      "Reb Zysze Plocker lies here and did not start here. Under the German occupation, while the matzevos of the old cemetery were being carted off for road work, a group of Jews dug up his kever, wrapped his remains in a tallis and reburied him in this ground together with the sifrei Torah that had been desecrated. There is no stone to point to; what is here is the fact of it.",
    ],
    burials: [],
    sourceUrl: "https://jewishplock.eu/en/old-jewish-cemetery/",
  },
  {
    slug: "tomaszow-mazowiecki-cemetery",
    city: "Tomaszów Mazowiecki",
    yiddishCity: "טומאשוב",
    name: "Tomashov — the Jewish cemetery",
    yiddishName: "טומאשוב — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, ulica Smutna 19, Tomaszów Mazowiecki, Łódź Voivodeship, Poland",
    airportRef: "51.532, 20.008",
    arrivalNotes: [
      "The address is Smutna 19, but THE GATE IS ROUND THE OTHER SIDE, on gen. Stefana Roweckiego \"Grota\". Navigating to the postal address alone puts you at a wall.",
      "This is one of the fuller cemeteries left in central Poland — nearly three hectares with about two thousand matzevos still standing, the oldest of them from 1843. It was opened in 1831.",
      "THE OHEL IS A RUIN. The tzaddik it stood over is recorded as Reb Yaakov Eliyahu, son of Reb Avraham Kohen, niftar 1888; the structure was pulled down and only its remains are on the ground. Sources give his name in two different Polonised spellings, so do not expect the site to be labelled the way you have it written.",
      "Tomaszów is between Łódź and Kielce and is usually reached from Łódź, which is where the kosher food and the minyan are.",
    ],
    burials: [
      {
        name: "Rabbi Yaakov Eliyahu",
        yiddishName: "רבי יעקב אליהו",
        knownAs: "Son of Reb Avraham Kohen — the ruined ohel",
        yahrzeit: "5648 / 1888",
        note: "The tzaddik whose ohel stood in this cemetery until it was destroyed. The surveys spell him Jakob Elijah and Eliasz Jakub Wieliczkier and do not agree; the Hebrew form here is the one both of those transliterate, and no more than that should be read into it.",
      },
    ],
    sourceUrl: "https://sztetl.org.pl/en/towns/t/525-tomaszow-mazowiecki/114-cemeteries/37026-cmentarz-zydowski-ul-smutna",
  },
];
