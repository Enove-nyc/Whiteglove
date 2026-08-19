// Bulk kevarim — batch 28. Four more directory towns, and two of the four have
// no cemetery left at all.
//
// That is not a filler page. Šiauliai and Raseiniai are both towns somebody
// will put into a route because the name is famous, and both will waste a
// morning if nobody says in advance what is there. Šiauliai's matzevos were
// bulldozed into piles and part of the ground went into a flight of public
// steps by the cathedral. Raseiniai's cemetery is the yard of a block of
// flats, with a tablet on the wall. Saying so is the service.
//
// NOWY ŻMIGRÓD IS A KEVER OF KEDOSHIM BEFORE IT IS ANYTHING ELSE. The Germans
// used the cemetery itself as a killing ground from 1940, and people were
// buried in it where they fell. Anyone walking it should know that before
// they arrive, not after.
//
// Reb Sinai Halberstam of Sanz-Żmigród is NOT listed as buried there. He led
// the Żmigród branch of the Sanzer line and was killed in 1941, and no source
// found says where he lies. Żmigród is where he was rebbe, not where he is.
//
// Svidník, Carei and Cluj were all searched for this batch and produced
// nothing firm enough to send somebody with.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries28: Cemetery[] = [
  {
    slug: "zmigrod-cemetery",
    city: "Nowy Żmigród",
    yiddishCity: "זשמיגראד",
    name: "Żmigród — the Jewish cemetery",
    yiddishName: "זשמיגראד — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, on the hill slope north-east of the town, on the Jasło road, Nowy Żmigród, Subcarpathian Voivodeship, Poland",
    coordinates: "49.611758, 21.531971",
    airportRef: "49.605, 21.514",
    arrivalNotes: [
      "It is about a kilometre from the market square along the road toward Jasło, on a gentle slope at the north-eastern edge of the town. The ground was opened around the turn of the sixteen hundreds.",
      "THIS GROUND IS ITSELF A PLACE OF KEDOSHIM. The Germans used the cemetery as a killing site from 1940 onward — about a hundred and fifty Jews found in hiding were shot in it that year, and there were further shootings through 1941 and 1942, with the murdered buried where they lay. On the seventh of July 1942, the day the kehilla was destroyed, some forty more who had been found hiding were brought up here and shot. Behave in it accordingly.",
      "REB SINAI HALBERSTAM IS NOT RECORDED AS BURIED HERE. He led the Sanz-Żmigród branch of the Sanzer line from 1907 and was killed in 1941. No source found says where his kever is, and Żmigród is where he was rebbe rather than where he lies.",
      "Żmigród is in the Carpathian foothills between Jasło and Dukla, on the same road as Nowy Sącz and Rymanow rather than a journey of its own.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://sztetl.org.pl/en/node/136/99-history/137767-history-of-community",
  },
  {
    slug: "tulchyn-cemetery",
    city: "Tulchyn",
    yiddishCity: "טולטשין",
    name: "Tulchyn — the Jewish cemetery",
    yiddishName: "טולטשין — בית החיים",
    country: "Ukraine",
    address: "Jewish cemetery, on the hillside in the town, Tulchyn, Vinnytsia Oblast, Ukraine",
    coordinates: "48.66503, 28.86877",
    airportRef: "48.674, 28.847",
    arrivalNotes: [
      "The old ground is on a hillside inside the town and you turn straight off a public road into it. The fence is broken and the gate locks, but access is open to all — the caretaker who has held the key is recorded as Mikhail Abramovitch Bartik. There is a second, modern cemetery opened in 1984, unfenced, which is not the one to walk.",
      "AN OHEL STANDS ON THE GROUND and it is the only structure there. No source found says whose it is, so this listing does not name him.",
      "THE OLDEST READABLE MATZEVAH IS FROM 1732 — Reb Avraham, son of Reb Shaulya. Between one and five thousand stones survive, a quarter to a half of them down, and many more were taken away into the town's roads and buildings. Some carry portraits and some have iron railings round them, which is a Podolian style and not a mistake.",
      "THERE ARE MARKED MASS GRAVES IN THE CEMETERY from December 1941. Tulchyn's Jews were driven out to Pechera that winter, and this ground holds some of what was done here first.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [
      {
        name: "Rabbi Avraham son of Rabbi Shaulya",
        yiddishName: "רבי אברהם בן רבי שאוליא",
        yahrzeit: "5492 / 1732",
        note: "His matzevah is the oldest one still readable in the cemetery. The survey records the stone and the year and nothing further about him, and neither does this listing.",
      },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/ukraine/tulchin",
  },
  {
    slug: "siauliai-cemetery-site",
    city: "Šiauliai (Shavl)",
    yiddishCity: "שאוול",
    name: "Shavl — the site of the Jewish cemetery",
    yiddishName: "שאוול — פלאץ פון בית החיים",
    country: "Lithuania",
    address: "Site of the old Jewish cemetery, Šiauliai, Šiauliai County, Lithuania",
    airportRef: "55.933, 23.313",
    arrivalNotes: [
      "THERE IS NO CEMETERY TO WALK. The ground goes back to the early seventeen hundreds. It was closed when the city cemetery opened in 1959, closed again in 1965, and then cleared with bulldozers — the matzevos were piled up and carted off, the better-cut ones taken elsewhere and the rest broken up for city fencing.",
      "PART OF IT WENT INTO A PUBLIC STAIRCASE. Some of the stone was built into the flight of steps by the cathedral known as Aušros Takas. People walk up them without knowing.",
      "What is left on the site is a small memorial stone at the old entrance, covered in graffiti, a few broken graves, and the northern stretch of the wall that once went round the whole ground. That wall is the clearest thing to find.",
      "The site is not protected in practice. In August 2018 pipe-laying work turned up human remains and bone fragments on it, which was reported and photographed. Nothing about the ground should be assumed to be respected.",
    ],
    burials: [],
    sourceUrl: "https://jewish-heritage-europe.eu/2019/10/08/lithuania-case-study/",
  },
  {
    slug: "raseiniai-cemetery-site",
    city: "Raseiniai",
    yiddishCity: "ראסיין",
    name: "Raseiniai — the site of the Jewish cemetery",
    yiddishName: "ראסיין — פלאץ פון בית החיים",
    country: "Lithuania",
    address: "Site of the Jewish cemetery, in the yard of an apartment block, Raseiniai, Kaunas County, Lithuania",
    airportRef: "55.372, 23.117",
    arrivalNotes: [
      "IT IS THE YARD OF A BLOCK OF FLATS. The cemetery was destroyed during or after the war and a modern apartment building was put up over it. There are no stones and there is no gate.",
      "WHAT MARKS IT IS A TABLET ON A WALL, saying in Yiddish and in Lithuanian that a Jewish cemetery was on this spot. That is the whole of it, and it is what you go to stand in front of.",
      "Raseiniai was one of the large Litvishe kehillos, so the ground under that yard holds hundreds and probably thousands of kevorim. Nobody knows who or where.",
      "Lithuania has something like two hundred abandoned Jewish cemeteries. Maceva has been photographing what stones survive across the country, transcribing the Hebrew and translating it — worth a look before travelling to any Lithuanian town on this site, since some grounds have been fully catalogued and some, like this one, have nothing left to catalogue.",
    ],
    burials: [],
    sourceUrl: "https://www.litvak-cemetery.info/",
  },
];
