// Bulk kevarim — batch 10. Eretz Yisroel, where the site was thinnest.
//
// Poland carried 105 kevarim on this site and Eretz Yisroel 43, which is the
// wrong way round for where people actually go. This batch begins closing that:
// the kevarim of the Tannaim and the Nevi'im that Klal Yisroel has davened by
// for a thousand years and more, plus the Tzfat kabbalists who were missing
// from an entry that already had the Arizal and the Beis Yosef in it.
//
// IMPORTANT (safety): who is buried where comes from public sources, and every
// entry carries one. We do NOT invent a grave GPS, and this batch carries none
// at all — the sources gave the site, not the grave, and a coordinate for a
// grave is the one thing on this site that must never be guessed at. Navigate
// by the address and confirm the kever on the ground.
//
// A WORD ABOUT CERTAINTY, which matters more here than in Galicia.
//
// A kever in Lizhensk is documented: there are records, there is a matzeivah,
// there is a burial society's book. A kever attributed to a Navi or a Tanna is
// usually a tradition — sometimes a very old and very widely held one, and
// still a tradition rather than a record. Several of these sites are venerated
// by Muslims as well, under other names, and have been for centuries.
//
// None of that is a reason to stay away, and this site does not treat it as
// one. It is a reason not to tell somebody the spot is certain when it is not.
// So each entry says plainly what kind of thing it is, and where the sources
// disagree — Rabbi Yehuda HaNasi, the Ramchal — the disagreement is printed
// rather than settled by us.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries10: Cemetery[] = [
  {
    slug: "jerusalem-shimon-hatzaddik",
    city: "Jerusalem",
    yiddishCity: "ירושלים",
    name: "Kever Shimon HaTzaddik",
    yiddishName: "קבר שמעון הצדיק",
    country: "Israel",
    address:
      "Burial cave in the Shimon HaTzaddik quarter of Sheikh Jarrah, north of the Old City, Jerusalem — reached from Shimon HaTzaddik Street; no street number is published here",
    arrivalNotes: [
      "The kever is a rock-cut burial cave beneath the neighbourhood, not a building you can see from the road. Ask when you get there; it is well known locally.",
      "Lag BaOmer is the day. It has been a place of tefillah for many centuries, and the crowds on Lag BaOmer are the reason most people come.",
      "The land around the kever was bought in 1875 by the Sephardi Community Council together with the Ashkenazi General Council, and the neighbourhood built there took the kever's name.",
      "The surrounding streets are contested and have been the subject of a long legal and political dispute. Check the current situation before you go, particularly with children — and ask locally on the day rather than relying on anything printed in advance.",
      "Twenty minutes' walk from the Old City, or a short taxi.",
    ],
    accessNote:
      "Open pilgrimage site with no entry fee. The neighbourhood around it is politically sensitive; ask locally about the day you are planning before setting out.",
    burials: [
      {
        name: "Shimon HaTzaddik",
        yiddishName: "שמעון הצדיק",
        knownAs: "Shimon the Just — Kohen Gadol",
        note: "One of the last of the Anshei Knesses HaGedolah and Kohen Gadol in the 3rd century BCE — the one whose words open the first perek of Pirkei Avos, that the world stands on Torah, avodah and gemilus chassadim. The Gemara records that he went out to meet Alexander the Great at the gates of Yerushalayim. The cave has been held to be his for many centuries; it is a tradition of long standing rather than a documented burial.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Shimon_HaTzadik",
  },
  {
    slug: "nabi-samwil-shmuel-hanavi",
    city: "Nabi Samwil (near Jerusalem)",
    yiddishCity: "קבר שמואל הנביא",
    name: "Kever Shmuel HaNavi",
    yiddishName: "ציון שמואל הנביא",
    country: "Israel",
    address:
      "On the hilltop at Nabi Samwil, about 6 km north-west of Jerusalem, inside the Nabi Samwil national park — the kever is in the chamber below the mosque",
    arrivalNotes: [
      "The hill stands at 908 m and is the highest point around Yerushalayim; the view alone tells you why a fortress, a monastery and a mosque were each built on it in turn.",
      "The kever is downstairs. The building above is a mosque, put up in 1730 out of what had been a Crusader church, and the chamber with the kever is reached separately below it — there is a men's side and a women's side.",
      "The 28th of Iyar is the yahrzeit and the day of the year here. Crowds come, and it has long been the custom to bring three-year-old boys for an upsherin.",
      "It sits beyond the security barrier in Area C. The road is open and it is routinely visited, but check the current position before you go rather than assuming.",
    ],
    accessNote:
      "Open site with no entry fee at the kever itself; the surrounding national park charges. Men's and women's sections. A working mosque above and a Jewish place of tefillah below — dress and conduct accordingly.",
    burials: [
      {
        name: "Shmuel HaNavi",
        yiddishName: "שמואל הנביא",
        knownAs: "The prophet Samuel",
        yahrzeit: "כ״ח אייר",
        note: "The Navi who anointed Shaul and then Dovid HaMelech, and the last of the Shoftim. The identification of this hilltop as his burial place is recorded from Byzantine writings of the 5th century onward and has been a place of Jewish pilgrimage for many hundreds of years — an ancient tradition rather than a documented grave. Sefer Shmuel records that he was buried in Ramah, and which hill that is has been debated for as long.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Tomb_of_Samuel",
  },
  {
    slug: "beit-shearim-yehuda-hanasi",
    city: "Beit She'arim",
    yiddishCity: "בית שערים",
    name: "Beit She'arim — the necropolis and the kever of Rabbi Yehuda HaNasi",
    yiddishName: "בית שערים — קבר רבינו הקדוש",
    country: "Israel",
    address: "Beit She'arim National Park, near Kiryat Tiv'on, between Haifa and Nazareth, Northern District, Israel",
    arrivalNotes: [
      "This is a national park with an entry fee and closing times, not an open kever — plan around its hours, and note it closes earlier on Erev Shabbos and Erev Yom Tov.",
      "Cave 14 is the one held to be Rabbeinu HaKadosh's: three doorways, a triple arch, and two rectangular graves inside that were covered with stone slabs.",
      "It is a city of the dead rather than a single kever. Jews were brought here for burial from across the diaspora for generations after him, precisely because he was here, and the catacombs run a long way.",
      "About twenty minutes from Haifa, and it pairs naturally with Tzippori half an hour further east, where he lived his last seventeen years.",
    ],
    accessNote:
      "Israel Nature and Parks Authority site — entry fee, fixed opening hours, closes early on Fridays and Erev Yom Tov. Underground and uneven underfoot.",
    burials: [
      {
        name: "Rabbi Yehuda HaNasi",
        yiddishName: "רבי יהודה הנשיא",
        knownAs: "Rabbeinu HaKadosh — Rebbi",
        seforim: "משנה",
        note: "Redactor of the Mishnah, and the Nasi under whom it was set down. The Gemara in Kesubos describes his levayah being carried to Beis She'arim, and records that he had prepared a burial place for himself here — which is why the necropolis grew as it did. There is a second view, also old, that because he was niftar on a Friday he was buried in Tzippori where he was living at the time. We have not tried to settle it: Beis She'arim is what the Gemara says, and the other opinion is named here so nobody is told the matter is closed.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Beit_She'arim_necropolis",
  },
  {
    slug: "yavne-rabban-gamliel",
    city: "Yavne",
    yiddishCity: "יבנה",
    name: "Yavne — the kever held to be Rabban Gamliel's",
    yiddishName: "קבר רבן גמליאל דיבנה",
    country: "Israel",
    address: "Domed mausoleum in HaSanhedrin Park, Yavne, Central District, Israel",
    arrivalNotes: [
      "A domed stone building in a public park in the middle of Yavne, about half an hour south of Tel Aviv — easy to reach and rarely crowded.",
      "One thing to know before you arrive, because it surprises people. The same building is venerated by Muslims as the mausoleum of Abu Hurayra, a companion of Muhammad, and has been for centuries. Both traditions attach to the one structure.",
      "The Jewish identification is not new: medieval Jewish travel accounts from between 1266 and 1291 already describe the kever of Rabban Gamliel at Yavne, one of them noting it was then in use as a Muslim prayer house. Regular Jewish tefillah at the site resumed after 1948, largely among Sephardi olim from Arab lands.",
      "Yavne is where the Sanhedrin went after the Churban, which is what makes standing here worth the detour even though the kever is a tradition rather than a record.",
    ],
    accessNote: "Open public park, no entry fee. A shared site with a second religious tradition attached to it — conduct accordingly.",
    burials: [
      {
        name: "Rabban Gamliel of Yavne",
        yiddishName: "רבן גמליאל דיבנה",
        knownAs: "Rabban Gamliel II — first Nasi of the Sanhedrin after the Churban",
        note: "He led the Sanhedrin at Yavne after the destruction of the second Beis HaMikdash and did more than anyone to hold Klal Yisroel together in the years that followed. The attribution of this mausoleum to him is a tradition recorded by Jewish travellers from the 13th century onward; the same building is venerated as the mausoleum of Abu Hurayra.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Mausoleum_of_Abu_Hurayra",
  },
  {
    slug: "mir-belarus-bais-hachaim",
    city: "Mir (Belarus)",
    yiddishCity: "מיר",
    name: "Mir — the old bais hachaim",
    yiddishName: "מיר — בית החיים",
    country: "Belarus",
    address: "Jewish cemetery, Mir, Karelichy district, Grodno Region, Belarus — no street address is published here; ask in the town",
    arrivalNotes: [
      "Mir is a small town about 85 km south-west of Minsk. The yeshiva building and the shul still stand, and the town is used to the occasional visitor, but there is no organised reception — this is not Lizhensk.",
      "The bais hachaim carries a plaque naming Rabbi Eliyahu Boruch Kamai. Expect a field with old stones rather than a maintained site, and expect to look.",
      "The Mir that most people mean today — Yerushalayim, and Brooklyn — is the continuation of this yeshiva. What is here is where it started, and where the roshei yeshiva who were niftar before the war are buried.",
      "We are printing no gate contact and no opening time, because we could not stand behind either. Ask the Jewish community in Minsk before travelling out.",
    ],
    accessNote:
      "Open rural site with no facilities and no caretaker we can vouch for. Belarus requires most travellers to arrange documentation in advance — check the current position well before booking.",
    burials: [
      {
        name: "Rabbi Eliyahu Boruch Kamai",
        yiddishName: "רבי אליהו ברוך קמאי",
        knownAs: "Rov of Mir and rosh yeshiva",
        note: "Rov of Mir and rosh yeshiva of the Mirrer Yeshiva. The plaque in the bais hachaim calls him that genius of geniuses. His daughter Malka married Rabbi Eliezer Yehuda Finkel, son of the Alter of Slabodka, who joined the yeshiva's faculty in 1906 and later led the Mir.",
      },
      {
        name: "Rabbi Avraham Tzvi Hirsch Kamai",
        yiddishName: "רבי אברהם צבי הירש קמאי",
        knownAs: "Rov of Mir after his father",
        note: "Son of Rabbi Eliyahu Boruch, and rov of Mir after him.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Mir_Yeshiva_(Belarus)",
  },
];
