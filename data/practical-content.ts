// Researched practical content per destination, keyed by slug. This feeds the
// database seed (lib/seed-data.ts): on "Set up database" it becomes editable
// PracticalPlace + Contact rows and shows on the destination pages.
//
// IMPORTANT: everything here is gathered from public web sources and should be
// confirmed by the owner before travelers rely on it (access, hours, and phone
// numbers change). Each entry carries its source.

export type PlaceCat =
  | "ACCOMMODATION"
  | "KOSHER_FOOD"
  | "MINYAN"
  | "MIKVAH"
  | "TRANSPORT"
  | "AIRPORT"
  | "DRIVER";

export type ContentPlace = {
  category: PlaceCat;
  name: string;
  address?: string;
  /**
   * "lat, lng" for the place itself.
   *
   * What it buys: an accommodation with a coordinate can be asked what kosher
   * food is near IT, live, instead of the page saying "there is kosher food in
   * this city" and leaving the traveler to work out whether that means a walk
   * or a taxi. The database column has existed all along; the seed data had no
   * way to fill it.
   */
  coordinates?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  hours?: string;
  notes?: string;
  source?: string;
};

export type ContentContact = {
  label: string;
  phone?: string;
  email?: string;
  note?: string;
  source?: string;
};

export type DestinationContent = {
  contacts?: ContentContact[];
  places?: ContentPlace[];
};

// slug -> researched content
export const practicalContent: Record<string, DestinationContent> = {
  uman: {
    places: [
      {
        category: "KOSHER_FOOD",
        name: "Pushkina Street kosher eateries",
        address: "Pushkina St, Uman, Cherkasy Oblast, Ukraine",
        notes: "Dozens of kosher eateries line Pushkina St, the neighborhood around the Tziyon.",
        source: "http://www.milwaukeeindependent.com/articles/hasidic-life-uman-journey-across-ukraine-tomb-rabbi-nachman-breslov/",
      },
      {
        category: "MINYAN",
        name: "The Kloyz",
        address: "Off Pushkina St, ~30 seconds from the Tziyon, Uman",
        notes: "The largest minyan in Uman, in a large building beside the Tziyon.",
        source: "https://www.breslovnews.com/frequently-asked-questions-about-breslov/",
      },
      {
        category: "MINYAN",
        name: "Shiner's Shul",
        address: "Pushkina St, Uman",
        notes: "A popular minyan near the Tziyon.",
        source: "https://www.breslovnews.com/frequently-asked-questions-about-breslov/",
      },
    ],
  },
  medzhybizh: {
    contacts: [
      {
        label: "Ohel / Old Jewish Cemetery (kever access)",
        note: "The Baal Shem Tov's grave sits inside an enclosed ohel in the old Jewish cemetery at Baal Shem Tov St. 24; the compound is reported accessible 24 hours. No verified phone published online — arrange through the on-site hospitality center. Ukraine wartime advisories apply; confirm access before traveling.",
        source: "https://creativejewishmom.com/2018/05/the-gravesite-of-the-baal-shem-tov-medzhybizh-ukraine/",
      },
      {
        label: "Baal Shem Tov Shul (official site)",
        note: "Official website of the Baal Shem Tov synagogue/kever in Medzhybizh; check for current contact and updates.",
        source: "https://besht.mailchimpsites.com/",
      },
    ],
    places: [
      {
        category: "ACCOMMODATION",
        name: "Heichal Baal Shem Tov (on-site hospitality center)",
        address: "Baal Shem Tov St. 24, Medzhybizh 31530, Ukraine",
        notes: "On-site complex beside the ohel with guest rooms, study hall and dining hall; reported to sleep 200+ pilgrims. Busiest on Shavuos (the Besht's yahrzeit).",
        source: "https://creativejewishmom.com/2018/05/the-gravesite-of-the-baal-shem-tov-medzhybizh-ukraine/",
      },
      {
        category: "ACCOMMODATION",
        name: "Baal Shem Tov Vacation House",
        website: "https://www.rentbyowner.com/property/baal-shem-tov-vacation-house/AB-42725560",
        notes: "Private rental house in central Medzhybizh, 3 bedrooms / 2 bathrooms, sleeps up to 12; walking distance to the kever.",
        source: "https://www.rentbyowner.com/property/baal-shem-tov-vacation-house/AB-42725560",
      },
      {
        category: "MIKVAH",
        name: "Baal Shem Tov Mikvah (spring-fed)",
        address: "Baal Shem Tov St. 24, Medzhybizh 31530, Ukraine",
        hours: "Reported open 24 hours",
        notes: "Modern mikvah built at the spring where the Baal Shem Tov is said to have immersed; part of the kever compound.",
        source: "https://thecompletepilgrim.com/gravesite-baal-shem-tov/",
      },
      {
        category: "KOSHER_FOOD",
        name: "Dining hall at the Heichal Baal Shem Tov",
        address: "Baal Shem Tov St. 24, Medzhybizh 31530, Ukraine",
        notes: "Food service within the on-site hospitality complex for pilgrims; scales up around Shavuos.",
        source: "https://creativejewishmom.com/2018/05/the-gravesite-of-the-baal-shem-tov-medzhybizh-ukraine/",
      },
      {
        category: "MINYAN",
        name: "Baal Shem Tov Synagogue / ohel",
        address: "Baal Shem Tov St. 24, Medzhybizh 31530, Ukraine",
        notes: "Prayer at the ohel and restored Baal Shem Tov synagogue; large gatherings especially on Shavuos. Confirm daily minyan availability in advance.",
        source: "https://jguideeurope.org/en/region/ukraine/eastern-galicia-podolia-and-bukovina/medzhibozh/",
      },
      {
        category: "TRANSPORT",
        name: "Jewish heritage tours & transport to Ukraine",
        notes: "Organized Jewish heritage tours and private transport including Medzhybizh (roughly a 4-hour drive from Kyiv).",
        website: "https://www.momentumtours.com/jewish-heritage-tours-ukraine/",
        source: "https://www.momentumtours.com/jewish-heritage-tours-ukraine/",
      },
    ],
  },
  belz: {
    contacts: [
      {
        label: "Geder Avos / Ohalei Tzadikim (ohel & cemetery upkeep)",
        note: "Organizations that fenced Belz's old cemetery and restored the graves of the Belzer Rebbes (Sar Shalom, R' Yehoshua, R' Yissachar Dov). Contact via their website for access questions.",
        source: "http://www.gederavos.org/portfolio/belz/",
      },
    ],
    places: [
      {
        category: "ACCOMMODATION",
        name: "Belz pilgrims' hostel (near the cemetery)",
        address: "Northern part of Belz, opposite the Jewish cemetery, Lviv Oblast, Ukraine",
        notes: "A pilgrims' hostel built opposite the cemetery to serve visitors davening at the graves of the Belzer Rebbes. No public contact number found; arrange through a Belz pilgrimage organizer.",
        source: "https://shtetlroutes.eu/en/belz-putvnik/",
      },
      {
        category: "MIKVAH",
        name: "Mikveh by the Belz cemetery complex",
        address: "Northern part of Belz, near the Jewish cemetery, Lviv Oblast, Ukraine",
        notes: "A mikveh built alongside the new synagogue and pilgrims' hostel to serve visitors.",
        source: "https://shtetlroutes.eu/en/belz-putvnik/",
      },
      {
        category: "MINYAN",
        name: "New synagogue by the Belz cemetery",
        address: "Northern part of Belz, opposite the Jewish cemetery, Lviv Oblast, Ukraine",
        notes: "A synagogue built near the cemetery for pilgrims visiting the ohel of the Belzer Rebbes. No fixed daily minyan times found in sources.",
        source: "https://shtetlroutes.eu/en/belz-putvnik/",
      },
      {
        category: "AIRPORT",
        name: "Lviv (Danylo Halytskyi International Airport, LWO)",
        notes: "Belz is roughly 60-70 km north of Lviv; Lviv is the nearest major city and airport gateway for reaching the Belz kevarim by road.",
        source: "https://en.wikipedia.org/wiki/Belz",
      },
    ],
  },
  ropshitz: {
    contacts: [
      {
        label: "Foundation for Preservation of Jewish Heritage in Poland (FODŻ)",
        phone: "+48 22 436 60 00",
        email: "fodz@fodz.pl",
        note: "FODŻ owns the Łańcut synagogue and Jewish cemeteries. Per the Shtetl Routes guidebook, off-season visitors should contact the Foundation to arrange access. Office at ul. Twarda 6, Warsaw.",
        source: "https://shtetlroutes.eu/en/lancut-przewodnik/",
      },
      {
        label: "Old Jewish cemetery (ul. Moniuszki 15, Łańcut) — locked gate",
        note: "The cemetery is fenced and locked; a local key-holder meets visitors at the entrance. Arrange in advance (in season the synagogue is open May–September; off-season contact FODŻ). No published direct phone for the key-holder.",
        source: "https://shtetlroutes.eu/en/lancut-przewodnik/",
      },
    ],
    places: [
      {
        category: "AIRPORT",
        name: "Rzeszów–Jasionka Airport (RZE)",
        address: "Jasionka 942, 36-002 Jasionka (approx. 16 km west of Łańcut)",
        website: "https://www.rzeszowairport.pl/en/",
        notes: "Nearest airport to the Ropshitz kever. Other options within ~135–160 km: Lublin, Kraków (Balice), Lviv.",
        source: "https://en.wikipedia.org/wiki/Rzesz%C3%B3w%E2%80%93Jasionka_Airport",
      },
      {
        category: "ACCOMMODATION",
        name: "Hotels & apartments in Łańcut",
        notes: "General hotels/apartments in Łańcut near the castle (e.g. Hotel Zamkowy at ul. Zamkowa 1). None are kosher/Jewish-specific; a larger selection is in Rzeszów (~20 km). Pilgrims typically bring provisions or use tour-operator catering.",
        source: "https://www.booking.com/landmark/pl/lancut-castle.html",
      },
    ],
  },
  preshburg: {
    contacts: [
      {
        label: "Chatam Sofer Memorial — visit booking",
        phone: "+421 948 554 442",
        email: "memorial@znoba.sk",
        note: "The mausoleum is normally locked; visits must be arranged in advance (~48h) so the caretaker can open it. Visitors are accompanied at all times. Closed Shabbat / Jewish holidays. Modest dress; head covering for men. (Contact details corroborated across sources but confirm before travel.)",
        source: "https://audiala.com/en/slovakia/bratislava/chatam-sofer-memorial",
      },
      {
        label: "Bratislava Jewish Community (ŽNO Bratislava)",
        email: "memorial@znoba.sk",
        note: "Community office at Kozia 18, 814 47 Bratislava; administers the Memorial and arranges access and a local guide.",
        source: "https://www.slovak-jewish-heritage.org/route-sites/bratislava-chatam-sofer-memorial/",
      },
      {
        label: "Chabad of Slovakia — Rabbi Baruch Myers",
        note: "Point of contact for kosher food (advance order), mikvah appointments, and religious needs.",
        source: "https://www.chabad.org/jewish-centers/117972/Bratislava/Synagogue/Chabad-of-Slovakia",
      },
    ],
    places: [
      {
        category: "MINYAN",
        name: "Heydukova Street Synagogue",
        address: "Heydukova 11-13, Bratislava",
        phone: "+421 2 5441 6949",
        email: "synagogue.sk@gmail.com",
        website: "http://www.synagogue.sk/",
        notes: "The city's only active synagogue. Minyan on Shabbat and holidays; weekday/yahrzeit minyanim can be arranged in advance via the office. Some winter services move to the community office building — confirm when booking.",
        source: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/584091/jewish/Synagogue-Services.htm/lang/sk",
      },
      {
        category: "KOSHER_FOOD",
        name: "Chabad of Slovakia — kosher food (advance order)",
        address: "Kozia 25, Bratislava",
        website: "https://www.chabadslovakia.com/?lang=en",
        notes: "Kosher food available by advance order; kosher products, wine and meat for sale, under Rabbi Baruch Myers.",
        source: "https://www.jewishslovakia.com/templates/articlecco_cdo/aid/3788068/jewish/Kosher-Products-in-Slovakia.htm",
      },
      {
        category: "KOSHER_FOOD",
        name: "Chez David — kosher restaurant & pension",
        address: "Zámocká 13, Bratislava (near the castle)",
        phone: "+421 2 5441 3824",
        website: "http://www.chezdavid.sk/",
        notes: "Long-established kosher restaurant and guesthouse. Operating status/hours have varied over the years — confirm directly before relying on it.",
        source: "https://wanderlog.com/place/details/11983605/chez-david-pension--jewish-restaurant",
      },
      {
        category: "MIKVAH",
        name: "Bratislava Mikvah (Chabad of Slovakia)",
        address: "Zámocká 13 area, Bratislava",
        notes: "By appointment only; arrange through Chabad of Slovakia. Directory phone/email listings appear outdated — confirm current details with Chabad.",
        source: "https://www.totallyjewishtravel.com/mikvah_bratislava-TE23733-Mikvah-bratislava_slovakia.html",
      },
      {
        category: "TRANSPORT",
        name: "City bus/tram to Chatam Sofer Memorial",
        notes: "The Memorial has its own 'Chatam Sofer' stop on the Danube embankment. Buses 28, 29, 30 & 31 serve it; the 28 comes from the stop under Nový Most (SNP Bridge).",
        source: "https://en.wikipedia.org/wiki/Chatam_Sofer_Memorial",
      },
      {
        category: "AIRPORT",
        name: "Bratislava Airport (M. R. Štefánik, BTS)",
        website: "https://www.bts.aero/en/parking-and-transport/transport-from-the-airport/",
        notes: "Bratislava's own airport. City bus 61 connects it with the main railway station; night line N61 runs overnight.",
        source: "https://www.bts.aero/en/parking-and-transport/transport-from-the-airport/",
      },
      {
        category: "AIRPORT",
        name: "Vienna International Airport (VIE) — alternative gateway",
        notes: "Many pilgrims fly into Vienna. Slovak Lines coach runs Vienna Airport ⇄ Bratislava (~1h15); FlixBus also serves the route; private transfers and taxis available.",
        source: "https://www.rome2rio.com/s/Bratislava-Airport-BTS/Vienna",
      },
    ],
  },
  sanz: {
    contacts: [
      {
        label: "Cemetery keys — Barbara Makuch",
        phone: "+48 18 441 93 81",
        note: "Rybacka 3/2. Holds the keys to the cemetery gates; the ohel key is made available to hasidim.",
        source: "https://sztetl.org.pl/en/towns/n/538-nowy-sacz/114-cemeteries/24348-jewish-cemetery-nowy-sacz-rybacka-street",
      },
    ],
  },
  kerestir: {
    contacts: [
      {
        label: "Cemetery guard (Tzion access)",
        phone: "+36 30 353 9111",
        note: "The Tzion on the hill is usually open; if closed, call the guard (Mrs. Katy) to open it.",
        source: "https://rebshayele.org/kerestir",
      },
    ],
    places: [
      {
        category: "ACCOMMODATION",
        name: "Reb Shayele's Guest House",
        address: "Kossuth u. 67, 3916 Bodrogkeresztúr, Hungary",
        website: "https://rebshayele.org/",
        notes: "In Reb Shayale's former residence: hospitality, prayer services, and lodging for visitors.",
        source: "https://rebshayele.org/kerestir",
      },
      {
        category: "KOSHER_FOOD",
        name: "Reb Shayele's Guest House kitchen",
        address: "Kossuth u. 67, 3916 Bodrogkeresztúr, Hungary",
        notes: "Hot meals, drinks, and sandwiches for guests (expanded greatly around the yahrzeit).",
        source: "https://rebshayele.org/kerestir",
      },
      {
        category: "MIKVAH",
        name: "Kerestir mikveh",
        address: "Kossuth u. 67, 3916 Bodrogkeresztúr, Hungary",
        notes: "Mikveh available at the guest house complex.",
        source: "https://en.wikipedia.org/wiki/Yeshayah_Steiner",
      },
    ],
  },
  ijhel: {
    contacts: [
      {
        label: "Jewish cemetery caretaker (Sátoraljaújhely)",
        phone: "+36-47-321-029",
        note: "Listed caretaker (Laszlo Tarr) at 62 Majuskút Street; contact to arrange access to the old Jewish cemetery / ohel of the Yismach Moshe, at the northern end of Kazinczy Street. Number is from a cemetery-project record and may be dated — confirm before relying.",
        source: "https://www.iajgsjewishcemeteryproject.org/hungary/satoraljaujhely.html",
      },
      {
        label: "Reb Shayele's Guest House (Kerestir) — reservations",
        phone: "+1-347-314-4193",
        email: "reservations@rebshayele.org",
        note: "US booking line for the Kerestir guest house, the common lodging base ~30 min from Ihel. (Aggregator-sourced; confirm against rebshayele.org.)",
        source: "https://rebshayele.org/",
      },
    ],
    places: [
      {
        category: "KOSHER_FOOD",
        name: "Yismach Moshe Tzion — hospitality / refreshments",
        notes: "At the ohel in the old cemetery: self-service refreshments and prepared dishes to heat (separate meat and dairy microwaves), sandwiches. Availability tied to pilgrim traffic; heaviest on the 28 Tammuz yahrzeit.",
        source: "https://easykoshertravel.com/kerestir/",
      },
      {
        category: "ACCOMMODATION",
        name: "Reb Shayele's Guest House (Kerestir)",
        address: "67 Kossuth utca, Bodrogkeresztúr, Hungary",
        email: "reservations@rebshayele.org",
        website: "https://rebshayele.org/",
        notes: "Low-cost lodging ~30 min from the Yismach Moshe kever; on-site shul, mikvah and kosher meals. The most common lodging base for Ihel pilgrims.",
        source: "https://rebshayele.org/guest-house/",
      },
      {
        category: "AIRPORT",
        name: "Košice International Airport (KSC), Slovakia",
        website: "https://en.wikipedia.org/wiki/Ko%C5%A1ice_International_Airport",
        notes: "Closest airport; yahrzeit pilgrims commonly fly into Košice and continue to Ujhely (~30 min). Budapest (BUD) is the main alternative (~2.5–3 hr drive).",
        source: "https://easykoshertravel.com/kerestir/",
      },
      {
        category: "TRANSPORT",
        name: "Private transfers & heritage tours from Budapest",
        website: "https://budtransfer.com/en/personally-organized-tours-to-kerestir-bodrogkeresztur",
        notes: "Door-to-door private transfers and Jewish-heritage tours from Budapest Airport serving Ujhel–Sátoraljaújhely, Kerestir, Liska, Mád, Tokaj.",
        source: "https://budtransfer.com/en/budapest-airport-to-bodrogkeresztur",
      },
    ],
  },
  liska: {
    contacts: [
      {
        label: "Ach Pri Tevuah kever (Ohel), Olaszliszka Jewish cemetery",
        note: "Kever of Rav Tzvi Hersh Friedman (Ach Pri Tevuah, d. 14 Av 1874); the Tal Chaim is buried in the same ohel. Reported tziyun address: Kossuth Lajos út 15, Olaszliszka. Major yahrzeit gathering on 14 Av.",
        source: "https://www.boropark24.com/news/living-legacy-the-first-liska-rebbe-ach-pri-tevuah-1",
      },
      {
        label: "Reb Shayele's Guest House (Kerestir) — reservations",
        phone: "+1-347-314-4193",
        email: "reservations@rebshayele.org",
        note: "Main hospitality center for the region; Liska visits are commonly based out of Kerestir (~15 min away). (Aggregator-sourced; confirm against rebshayele.org.)",
        source: "https://rebshayele.org/reservations",
      },
    ],
    places: [
      {
        category: "ACCOMMODATION",
        name: "Reb Shayele's Guest House (Kerestir)",
        address: "67 Kossuth utca, Bodrogkeresztúr, 3916 Hungary",
        website: "https://rebshayele.org/",
        notes: "Low-cost lodging, meals, mikvah and minyanim year-round. Common lodging base for pilgrims to Liska, nearby in the Tokaj region.",
        source: "https://rebshayele.org/kerestir",
      },
      {
        category: "KOSHER_FOOD",
        name: "Mád Rabbi's House — kosher kitchen & accommodation",
        notes: "Renovated rabbi's house in Mád (Tokaj region) with a kosher kitchen, exhibition and lodging; another stop on the regional 'Wonder Rabbis' route.",
        source: "https://ganzach.org/mentions/the-town-that-came-back-to-life/",
      },
      {
        category: "TRANSPORT",
        name: "Daily shuttle Budapest ↔ Kerestir (Visit Kerestir)",
        website: "https://www.visitkerestir.com/en/transportation",
        notes: "Reported daily shuttle from the Budapest Jewish Quarter to Kerestir and the kever; transfers also serve Liska, Újhely, Mád and Tokaj. Confirm current schedule.",
        source: "https://www.visitkerestir.com/en/transportation",
      },
      {
        category: "AIRPORT",
        name: "Budapest Ferenc Liszt International Airport (BUD)",
        website: "https://www.visitkerestir.com/en/flights",
        notes: "Nearest major airport; the Tokaj region (Kerestir/Liska) is ~220 km / roughly 2.5 hours' drive northeast.",
        source: "https://www.visitkerestir.com/en/flights",
      },
    ],
  },
  munkatch: {
    contacts: [
      {
        label: "Jewish cemetery / Ohel of the Munkatcher Rebbes",
        note: "The Munkatcher rebbes (Minchas Elazar, Darchei Teshuvah, Shlomo Shapira) were reinterred in the 1970s in a new cemetery in Kerepec, adjoining Mukachevo, where the ohel now stands. A Beis Medrash (Ohel Rochel) serves visitors; gatherings notably around Lag B'Omer. No public booking line found — arrange access via the local community or a pilgrimage driver in advance. Ukraine wartime advisories apply.",
        source: "https://en.wikipedia.org/wiki/Chaim_Elazar_Spira",
      },
    ],
    places: [
      {
        category: "MINYAN",
        name: "Mukachevo synagogue / Jewish community",
        notes: "Active local community (rebuilt 2006) with prayer services three times daily, a supervised kosher kitchen and a mikvah. Confirm current minyan times before Shabbos.",
        source: "https://kehilalinks.jewishgen.org/mukacheve/",
      },
      {
        category: "MINYAN",
        name: "Jewish Community of Uzhgorod (Chabad)",
        address: "Rus'ka St 36, Uzhhorod (~45 km from Mukachevo)",
        notes: "Three daily minyanim; central Jewish infrastructure for the Zakarpattia/Carpathian region.",
        source: "https://www.chabad.org/jewish-centers/249713/Uzhgorod/Synagogue/Jewish-Community-of-Uzhgorod",
      },
      {
        category: "KOSHER_FOOD",
        name: "Kosher kitchen — Mukachevo Jewish community",
        notes: "The Mukachevo community operates a supervised kosher kitchen; arrange meals through the community in advance. Kosher meals are also available by reservation at Chabad of Uzhgorod (~45 km).",
        source: "https://kehilalinks.jewishgen.org/mukacheve/",
      },
      {
        category: "MIKVAH",
        name: "Mikvah, Mukachevo",
        notes: "Reported as the first mikvah in the Zakarpattia region; part of the local community's facilities. Confirm operating status/access before travel.",
        source: "https://www.theyeshivaworld.com/news/general/7363/new-mikva-in-uzhgorod-ukraine.html",
      },
      {
        category: "ACCOMMODATION",
        name: "Premier Hotel Star",
        address: "Central square, Mukachevo",
        website: "https://hotelstar.ua/en/",
        notes: "Central Mukachevo hotel, ~5 min walk from the train station. Not kosher — pair with kosher food arranged via the community/Chabad.",
        source: "https://www.booking.com/hotel/ua/star.html",
      },
      {
        category: "AIRPORT",
        name: "Košice Airport (KSC), Slovakia — practical gateway",
        notes: "~98 km from Uzhhorod; a common regional gateway while Ukrainian civil airspace is closed to commercial flights. Reachable from Mukachevo by bus/train (~4-5 hrs incl. border crossing).",
        source: "https://visitukraine.today/blog/2199/aeroporti-bilya-kordonu-z-ukrainoyu-zvidki-krashhe-letiti",
      },
      {
        category: "DRIVER",
        name: "Private transfers Budapest ⇄ Uzhhorod / Mukachevo",
        notes: "Private car/van transfer companies operate the Budapest–Uzhhorod–Mukachevo route across the HU/UA border; several market to Jewish heritage/kever travelers. Vet the operator and confirm current border wait times.",
        source: "https://privatetransferbudapest.com/uzhhorod-budapest-uzhgorod-transfers-taxi-shuttle-bus.html",
      },
    ],
  },
  lelov: {
    contacts: [
      {
        label: "Gminny Ośrodek Kultury w Lelowie (municipal cultural center)",
        phone: "+48 787 979 944",
        email: "goklelow@gmail.com",
        note: "Local cultural center at ul. Szczekocińska 31, 42-235 Lelów — a useful first point of contact for the town and its Jewish heritage sites. Not confirmed as the ohel key-holder (see below).",
        source: "https://gok.lelow.pl/page/details/126/kontakt",
      },
    ],
    places: [
      {
        category: "MINYAN",
        name: "Ohel of Reb Dovid Biderman (Reb Duvid'l of Lelov)",
        address: "ul. Ogrodowa 7, 42-235 Lelów, Poland (old Jewish cemetery)",
        notes: "The ohel over the tzaddik's grave is normally locked; the key is held by a neighbor who opens it for visitors for a small fee. Large crowds of Hasidic pilgrims gather annually on the yahrzeit, 7 Shevat (early-mid January), when organized minyanim take place. No permanent daily minyan in Lelów.",
        source: "https://sztetl.org.pl/pl/miejscowosci/l/442-lelow/114-cmentarze/19050-cmentarz-zydowski-w-lelowie-ul-ogrodowa-7",
      },
      {
        category: "ACCOMMODATION",
        name: "Lodging via Częstochowa (nearest larger town)",
        website: "https://www.booking.com/city/pl/czestochowa.html",
        notes: "Lelów is a small village ~39 km east of Częstochowa, the nearest larger town with a range of hotels. No kosher-certified hotel identified. A B&B option nearer the kever is The Palace at Nakło (Gmina Lelów).",
        source: "https://en.wikipedia.org/wiki/Lelow",
      },
      {
        category: "KOSHER_FOOD",
        name: "Kosher food via Kraków (~90–100 km)",
        website: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
        notes: "No kosher restaurant found in Częstochowa. Nearest reliable kosher supply is in Kraków — Chabad Kraków kosher store (ul. św. Sebastiana 23) and Kosher Delight dining hall (ul. Kupa 18, Kazimierz).",
        source: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
      },
      {
        category: "AIRPORT",
        name: "Katowice Airport (Pyrzowice, KTW)",
        website: "https://www.katowice-airport.com/en",
        notes: "Nearest international airport (Lelów is ~66 km NE of Katowice). Kraków–Balice (KRK) is the other regional option (~100+ km).",
        source: "https://en.wikipedia.org/wiki/Lelow",
      },
    ],
  },
  dynow: {
    contacts: [
      {
        label: "Bnei Yissaschar ohel — Old Jewish Cemetery, ul. Piłsudskiego, Dynów",
        note: "Ohel of the Dinov dynasty: R' Tzvi Elimelech Shapira (Bnei Yissaschar, d. 1841) and descendants. The cemetery is fenced with a gate; access is described as 'open with permission,' and some visitors have found the gate locked. No published key-holder contact — arrange in advance via a Jewish heritage tour operator.",
        source: "https://cdp.jewishgen.org/eastern-europe/poland/dynow",
      },
      {
        label: "Chabad-Lubavitch of Kraków — nearest full Jewish services",
        phone: "+48 12 430 2222",
        note: "Nearest active Chabad (~2 hrs from Dynów). Provides synagogue/minyan, kosher food, and mikvah; can advise travelers.",
        source: "https://www.chabad.org/jewish-centers/419504/Krakow/Synagogue/Chabad-Lubavitch-of-Krakow",
      },
    ],
    places: [
      {
        category: "AIRPORT",
        name: "Rzeszów–Jasionka Airport (RZE)",
        notes: "Nearest airport to Dynów (~30+ km SSE of Rzeszów). Closest general hotels cluster near the airport (Jasionka); none are kosher.",
        source: "https://www.booking.com/airport/pl/rze.html",
      },
      {
        category: "KOSHER_FOOD",
        name: "Kosher food via Kraków (~2 hrs)",
        website: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
        notes: "No kosher food or active Jewish community in Dynów or Rzeszów. Nearest options are in Kraków: Chabad Kraków kosher store (ul. św. Sebastiana 23), Falafel Shelanu (ul. Berka Joselewicza 9), and JCC Kraków catering (ul. Miodowa 24).",
        source: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
      },
      {
        category: "MINYAN",
        name: "Minyan & mikvah via Chabad of Kraków (~2 hrs)",
        address: "ul. św. Sebastiana 23, 31-039 Kraków",
        notes: "Daily minyan and a mikvah at Chabad of Kraków — the nearest reliable minyan and mikvah to Dynów. Contact Chabad Kraków to arrange.",
        source: "https://www.totallyjewishtravel.com/Synagogues-TE54838-chabad_of_krakow-shul-krakow_poland-Minyan.html",
      },
      {
        category: "TRANSPORT",
        name: "Rzeszów airport transfers & chauffeur service",
        website: "https://viptransfers.pl/en/rzeszow-airport-transfer/",
        notes: "Private airport transfers and chauffeur service covering the Rzeszów/Przemyśl area. No driver dedicated specifically to the Dynów kever was found — arrange privately or via a tour operator.",
        source: "https://viptransfers.pl/en/rzeszow-airport-transfer/",
      },
    ],
  },
  rymanow: {
    contacts: [
      {
        label: "Jewish cemetery visiting contact (Kalwaria hill)",
        phone: "+48 608 832 983",
        note: "The two ohels (Menachem Mendel; and Tzvi Hirsch Kohen + Józef Friedman) sit atop the cemetery hill and are usually locked. The regional tourism board advises calling before visiting. Alternate number: +48 13 435 64 81.",
        source: "https://podkarpackie.travel/en/product/synagogue-and-jewish-cemetery-in-rymanow",
      },
      {
        label: "Congregation Menachem Zion / Jewish House (synagogue owner)",
        phone: "+48 663 517 815",
        note: "Contact for the Rymanów synagogue / Jewish House (Piękna 2, 38-480 Rymanów). Congregation Menachem Zion owns the synagogue.",
        source: "https://its-poland.com/attraction/synagogue-and-the-jewish-house-in-rymanow",
      },
      {
        label: "Cemetery key-holder / caretaker (older archival record)",
        note: "The IAJGS Intl Jewish Cemetery Project lists the caretaker-with-key as M. Bialis, ul. Grunwaldzka 9, Rymanów. This is an older archival record — verify before relying on it; the tourism-board numbers above are the more current lead.",
        source: "https://iajgscemetery.org/eastern-europe/poland/rymanow-i",
      },
    ],
    places: [
      {
        category: "AIRPORT",
        name: "Rzeszów–Jasionka Airport (RZE)",
        notes: "Nearest airport to Rymanów, ~69 km (about 1 hr by car). No direct public transport to the kever — a car/driver is effectively required.",
        source: "https://www.worldtravelguide.net/guides/europe/poland/rzeszow-jasionka-airport/",
      },
      {
        category: "ACCOMMODATION",
        name: "Rymanów-Zdrój guesthouses/hotels (general — not kosher)",
        website: "https://www.booking.com/city/pl/rymanow-zdroj.html",
        notes: "Rymanów-Zdrój is a spa town ~7 km from the cemetery with numerous guesthouses/hotels. None are kosher; listed only as a lodging base. Krosno (~15 km) and Rzeszów (~60 km) offer more hotels.",
        source: "https://www.booking.com/city/pl/rymanow-zdroj.html",
      },
      {
        category: "KOSHER_FOOD",
        name: "Kosher food via Kraków (~190 km)",
        website: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
        notes: "No kosher food in Rymanów/Krosno/Rzeszów. Nearest is Kraków — Chabad Kraków kosher store & food truck (ul. Kupa). Bring provisions or stock up in Kraków.",
        source: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708429/jewish/Kosher-Food-in-Krakow.htm",
      },
      {
        category: "MINYAN",
        name: "Minyan & mikvah via Chabad of Kraków (~190 km)",
        address: "ul. Kupa 18 / mikvah at ul. Ciemna 15, Kraków",
        phone: "+48 12 430 22 22",
        website: "https://www.chabadkrakow.org",
        notes: "Nearest reliable minyan base (Shabbat minyan reliable; weekday not guaranteed) and mikvah. Pilgrims typically base in Kraków and day-trip to the kevarim.",
        source: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708428/jewish/Synagogue-Services.htm",
      },
      {
        category: "DRIVER",
        name: "Chabad Kraków recommended drivers / tours",
        website: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/1257635/jewish/Tours-and-drivers.htm",
        notes: "Chabad Kraków publishes a page recommending local drivers for visiting Jewish heritage/kever sites; arrange via Chabad Kraków. No specific driver phone is published.",
        source: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/1257635/jewish/Tours-and-drivers.htm",
      },
    ],
  },
};
