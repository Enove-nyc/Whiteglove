export type Burial = {
  name: string;
  yiddishName: string;
  knownAs?: string;
  seforim?: string;
  yahrzeit?: string;
  note?: string;
};

export type Cemetery = {
  slug: string;
  city: string;
  yiddishCity: string;
  name: string;
  yiddishName: string;
  country: string;
  address: string;
  coordinates?: string;
  // City-level point ("lat, lng") used ONLY to rank the nearest airports when we
  // don't have the exact grave GPS. NEVER a grave location — travelers must not
  // navigate to this; grave navigation always uses `coordinates` or `address`.
  airportRef?: string;
  arrivalNotes: string[];
  accessNote?: string;
  accessContacts?: Array<{
    label: string;
    phone?: string;
    email?: string;
    note: string;
  }>;
  burials: Burial[];
  // Nearby practical listings (kosher food, lodging, minyan, mikvah, transport)
  // — the same shape as data/practical-content.ts.
  places?: ContentPlace[];
  sourceUrl: string;
};

const featuredCemeteries: Cemetery[] = [
  {
    slug: "lizhensk",
    city: "Lizhensk (Leżajsk)",
    yiddishCity: "ליזענסק",
    name: "Lizhensk Jewish Cemetery",
    yiddishName: "בית החיים ליזענסק",
    country: "Poland",
    address: "Górna 16, 37-300 Leżajsk, Poland",
    // Owner-verified ohel location: 50°15'04.1"N 22°25'21.4"E
    coordinates: "50.251139, 22.422611",
    arrivalNotes: [
      "Navigate to Górna 16, the Jewish cemetery on the edge of the town.",
      "The ohel is the focal point of the cemetery; the graves of members of Reb Elimelech's family are recorded in and around the ohel.",
      "For 21 Adar, allow extra time and follow the current crowd, parking, and access arrangements.",
    ],
    burials: [
      { name: "Rabbi Elimelech Weisblum", yiddishName: "רבי אלימלך מליזענסק", knownAs: "Noam Elimelech", seforim: "נועם אלימלך", yahrzeit: "כ״א אדר · 5547 / 1787" },
      { name: "Rabbi Elazar Weisblum", yiddishName: "רבי אלעזר בן רבי אלימלך", knownAs: "Tzaddik of Chmielnik", yahrzeit: "1813", note: "A memorial inscription for Reb Elimelech's son is recorded at the ohel." },
      { name: "Rabbi Menachem Yissachar Weisblum", yiddishName: "רבי מנחם יששכר בן רבי אלימלך", yahrzeit: "1814", note: "A memorial inscription for Reb Elimelech's son is recorded at the ohel." },
      { name: "Rabbi Naftali Weisblum", yiddishName: "רבי נפתלי נכד רבי אלימלך", knownAs: "Tzaddik of Lizhensk", note: "Recorded among the family epitaphs at the ohel." },
      { name: "Rabbi Natan Yechezkel", yiddishName: "רבי נתן יחזקאל", note: "Son-in-law of Reb Elimelech; recorded among the family epitaphs at the ohel." },
      { name: "Rabbi Yisrael", yiddishName: "רבי ישראל", note: "Son-in-law of Reb Elimelech; recorded among the family epitaphs at the ohel." },
    ],
    sourceUrl: "https://sztetl.org.pl/en/node/188/114-cemeteries/19248-cmentarz-zydowski-w-lezajsku-ul-gorna",
  },
  {
    slug: "krakow-remuh",
    city: "Kraków",
    yiddishCity: "קראקא",
    name: "Remuh Cemetery · Old Jewish Cemetery",
    yiddishName: "בית החיים רמ״א · בית החיים הישן",
    country: "Poland",
    address: "Szeroka 40, 31-053 Kraków, Poland",
    coordinates: "50.053124, 19.944142",
    arrivalNotes: [
      "Navigate to Szeroka 40 in Kazimierz; the cemetery is directly beside the Remuh Synagogue.",
      "This is the old cemetery, not the new cemetery on Miodowa Street.",
      "Once inside, follow the cemetery layout and current local instructions to the individual matzeivos.",
    ],
    burials: [
      { name: "Rabbi Moshe Isserles", yiddishName: "רבי משה איסרליש", knownAs: "The Rema", seforim: "המפה · תורת חטאת · דרכי משה", yahrzeit: "ל״ג בעומר · 5332 / 1572" },
      { name: "Rabbi Yoel Sirkis", yiddishName: "רבי יואל סירקיש", knownAs: "The Bach", seforim: "בית חדש", yahrzeit: "1640" },
      { name: "Rabbi Yom Tov Lipmann Heller", yiddishName: "רבי יום טוב ליפמן העלער", knownAs: "Tosafos Yom Tov", seforim: "תוספות יום טוב", yahrzeit: "1654" },
      { name: "Rabbi Natan Nata Shapira", yiddishName: "רבי נתן נטע שפירא", knownAs: "Megaleh Amukos", seforim: "מגלה עמוקות", yahrzeit: "1633" },
      { name: "Rabbi Yehoshua ben Yosef", yiddishName: "רבי יהושע בן יוסף", knownAs: "Meginei Shlomo", seforim: "מגיני שלמה", yahrzeit: "1648" },
      { name: "Rabbi Mordechai Saba", yiddishName: "רבי מרדכי סבא", knownAs: "Mekubal of Kraków", yahrzeit: "1576", note: "A mekubal versed in dikduk who succeeded the Rema as head of the Kraków rabbinical academy." },
      { name: "Rabbi Yosef Kac", yiddishName: "רבי יוסף כ״ץ", note: "Head of the Kraków Talmudic Academy." },
      { name: "Rabbi Yitzchak Yaakovovich", yiddishName: "רבי יצחק יעקובוביץ", knownAs: "Founder of the Izaak Synagogue" },
    ],
    sourceUrl: "https://gwzkrakow.pl/en/cemeteries/",
  },
  {
    slug: "krakow-new",
    city: "Kraków",
    yiddishCity: "קראקא",
    name: "New Jewish Cemetery · Miodowa",
    yiddishName: "בית החיים החדש קראקא · מיודובה",
    country: "Poland",
    address: "Miodowa 55, 31-036 Kraków, Poland",
    coordinates: "50.05414, 19.95046",
    arrivalNotes: [
      "Navigate to Miodowa 55 in Kazimierz; this is the new Jewish cemetery.",
      "Do not confuse it with the Remuh / old cemetery at Szeroka 40, which is a separate site several blocks away.",
      "Use the current cemetery entrance and follow local access instructions once you arrive.",
    ],
    accessNote: "This is a separate בית החיים from the Remuh cemetery. A current public שומר / cemetery-access number has not yet been verified for this location.",
    burials: [
      { name: "Rabbi Yosef Kornitzer", yiddishName: "רבי יוסף קורניצר", knownAs: "Rabbi of Kraków" },
      { name: "Rabbi Ozjasz Thon", yiddishName: "רבי עוזיאש טהון", knownAs: "Rabbi and communal leader" },
      { name: "Rabbi Aharon Elimelech", yiddishName: "רבי אהרן אלימלך", knownAs: "Tzaddik Aharon Elimelech" },
      { name: "Maurycy Gottlieb", yiddishName: "מאוריצי גוטליב", knownAs: "Jewish painter" },
      { name: "Leopold Kozłowski", yiddishName: "לעאפאלד קאזלאווסקי", knownAs: "Klezmer musician" },
    ],
    sourceUrl: "https://gwzkrakow.pl/en/cemeteries/",
  },
  {
    slug: "tarcal",
    city: "Tarcal",
    yiddishCity: "טערצאל",
    name: "Tarcal Jewish Cemetery",
    yiddishName: "בית החיים טערצאל",
    country: "Hungary",
    address: "Keresztúri u. 25, 3915 Tarcal, Hungary",
    coordinates: "48.135250, 21.346000",
    arrivalNotes: [
      "The cemetery is on the southern slope of Kopasz (Tokaj) Hill, along the road running north out of the village toward Bodrogkeresztúr; it is walled with a gate.",
      "Tarcal is a stop on the regional 'Path of the Wonder Rabbis' (Csodarabbik útja) pilgrimage route based out of Mád, which also covers Mád, Tokaj, Olaszliszka and Bodrogkeresztúr.",
      "Logistics are effectively handled via Kerestir (Bodrogkeresztúr), ~7 km away: Reb Shayele's Guest House (Kossuth u. 67) offers kosher meals, minyanim, a mikvah and lodging year-round and is the natural base for visiting Tarcal.",
      "A box for kvitlach (written petitions) stands before Reb Yaakov Spira's ohel.",
    ],
    accessNote: "Walled cemetery with a gate and no on-site staffing; access is typically arranged in advance via the local caretaker or the regional Wonder-Rabbis heritage office. Please confirm before traveling.",
    accessContacts: [
      { label: "Csodarabbik útja / Mádi Rabbiház (regional Wonder-Rabbis heritage office)", phone: "+36 47 588 278", email: "csodarabbikutja@zsido.com", note: "Based at Mád, Rákóczi út 75; coordinates guided access and pilgrimage arrangements across the Tokaj-Hegyalja region including Tarcal. Re-verify before relying on it." },
      { label: "Cemetery caretaker (per IAJGS survey — may be dated)", note: "János Bánóczki, Keresztúri utca 24, immediately next to the cemetery. No published phone found." },
    ],
    burials: [
      { name: "Rabbi Yaakov (Jakab) Spira of Tarcal", yiddishName: "רבי יעקב שפירא", knownAs: "The Rov of Tarcal", yahrzeit: "1906", note: "The village's renowned rabbi; his ohel — shared with his wife — is the most-visited grave in the old cemetery and was renovated in the late 2010s. A box for kvitlach stands before the tomb." },
    ],
    places: [
      { category: "ACCOMMODATION", name: "Reb Shayele's Guest House (Kerestir)", address: "Kossuth Lajos u. 67, Bodrogkeresztúr, Hungary", phone: "+1-347-314-4193", email: "reservations@rebshayele.org", website: "https://rebshayele.org/", notes: "Main pilgrim base for the Tokaj/Kerestir area (~5-7 km from Tarcal): low-cost kosher lodging, meals, shul and mikvah.", source: "https://rebshayele.org/" },
      { category: "KOSHER_FOOD", name: "Reb Shayele's Guest House kitchen (Kerestir)", address: "Kossuth Lajos u. 67, Bodrogkeresztúr, Hungary", website: "https://rebshayele.org/", notes: "Hot meals, drinks and sandwiches for visitors, ~5-7 km from the Tarcal cemetery.", source: "https://rebshayele.org/" },
      { category: "MIKVAH", name: "Kerestir guest house mikvah", address: "Kossuth Lajos u. 67, Bodrogkeresztúr, Hungary", notes: "On-site mikvah at the Kerestir complex, ~5-7 km from Tarcal.", source: "https://koshertravelinfo.com/listings/kerestir-guest-at-the-house-of-rabbi-yeshaya-steiner/" },
      { category: "MINYAN", name: "Reb Shayele's House Synagogue (Kerestir)", address: "Kossuth Lajos u. 67, Bodrogkeresztúr, Hungary", website: "https://rebshayele.org/", notes: "Prayer services in Reb Shayele's former residence; minyanim especially heavy around the yahrzeit. ~5-7 km from Tarcal.", source: "https://rebshayele.org/" },
      { category: "ACCOMMODATION", name: "Mádi Rabbiház Fogadó (Rabbi's House Inn, Mád)", address: "Rákóczi út 75, 3909 Mád, Hungary", phone: "+36-47-588-278", email: "csodarabbikutja@zsido.com", website: "https://footstepsofwonderrabbis.com/", notes: "Renovated rabbi's house next to Mád synagogue with a kosher kitchen and guest rooms — hub of the Wonder-Rabbis route, ~13-15 km from Tarcal.", source: "http://www.mad.info.hu/madi-rabbihaz-fogado" },
      { category: "TRANSPORT", name: "Kerestir Transfer (VIP transfers)", website: "https://kerestir-transfer.com/", notes: "Door-to-door transfers Budapest airport ⇄ Kerestir/Tarcal/Mád/Tokaj and the surrounding kevarim.", source: "https://kerestir-transfer.com/services" },
      { category: "AIRPORT", name: "Debrecen International Airport (DEB)", website: "https://en.wikipedia.org/wiki/Debrecen_International_Airport", notes: "Nearest regional airport to the Tokaj/Tarcal area (~65-70 km). Budapest (BUD, ~230 km) is the main international gateway.", source: "https://en.wikipedia.org/wiki/Debrecen_International_Airport" },
    ],
    sourceUrl: "https://footstepsofwonderrabbis.com/en/tourism/item/jewish-cemetery-tarcal-49157",
  },
  {
    slug: "dolyna",
    city: "Dolyna",
    yiddishCity: "דאלינא",
    name: "Dolyna Jewish Cemetery",
    yiddishName: "בית החיים דאלינא",
    country: "Ukraine",
    address: "Vulytsya Volodymyra Vynnychenka 39, Dolyna, Ivano-Frankivsk Oblast, Ukraine, 77500",
    coordinates: "48.961889, 23.994889",
    arrivalNotes: [
      "Dolyna is a town in Ivano-Frankivsk Oblast in western Ukraine's historic Galicia — the shtetl known in Yiddish/Polish sources as Dolina. It became a notable Hasidic center in the 19th century.",
      "Nearest city with an organized Jewish community and kosher infrastructure is Ivano-Frankivsk (~1 hour's drive): the Chabad-run community at Strachenykh St. 7 (Rabbi Moshe Leib Kolesnik) has a synagogue, mikvah, kosher restaurant and guest rooms — the practical base for a visit.",
      "Nearest airports are Ivano-Frankivsk and Lviv; Ukrainian civil airspace has been closed since 2022, so travelers typically enter overland via Poland.",
    ],
    accessNote: "The cemetery's present physical condition and gate status could not be confirmed from a public source; treat access as unverified. Ukraine remains under wartime martial law — confirm safety, entry and site access with the Ivano-Frankivsk Jewish community before travel.",
    burials: [
      { name: "Rabbi Yissachar Berish Eichenstein", yiddishName: "רבי ישכר בעריש אייכענשטיין", knownAs: "The Doliner Rebbe", seforim: "ליקוטי תורה מהר״י", yahrzeit: "1886", note: "Son of R' Yitzchak Isaac Eichenstein of Zhydachiv (Zidichov) and son-in-law of R' Avraham of Stretyn; made Dolina a Hasidic center. Sources identify him as the rebbe 'of Dolina' who died in 1886, but explicit confirmation that he is buried in the Dolyna cemetery was not found — verify before treating as a kever site." },
    ],
    places: [
      { category: "MINYAN", name: "Jewish Community of Ivano-Frankivsk (Chabad)", address: "Strachenykh St. 7, Ivano-Frankivsk 76000, Ukraine", phone: "+380 50 463 1286", website: "https://www.chabad.org/jewish-centers/249594/Ivano-Frankovsk/Synagogue/Jewish-Community-of-Ivano-Frankovsk", notes: "Community led by Rabbi Moshe Leib Kolesnik; synagogue with men's/women's halls, mikvah, dining room, guest rooms — the practical hub ~1 hr from Dolyna. Confirm by phone (wartime hours vary).", source: "https://fjc-fsu.org/centers/ivano-frankivsk/" },
      { category: "MIKVAH", name: "Mikvah at the Ivano-Frankivsk Synagogue", address: "Strachenykh St. 7, Ivano-Frankivsk 76000, Ukraine", phone: "+380 50 463 1286", notes: "Mikvah in the community synagogue building; arrange access via the community office. ~1 hr from Dolyna.", source: "https://www.chabad.org/jewish-centers/249594/Ivano-Frankovsk/Synagogue/Jewish-Community-of-Ivano-Frankovsk" },
      { category: "KOSHER_FOOD", name: "Tzimmes Lounge (kosher, Ivano-Frankivsk)", address: "Next to the main synagogue, Ivano-Frankivsk, Ukraine", notes: "Kosher catering/dining under Rabbi Kolesnik's supervision — nearest reliable kosher food to Dolyna (~1 hr). Coordinate through the Chabad community.", source: "https://www.lubavitch.com/centers/europe/ukraine/ivano-frankovsk/" },
      { category: "ACCOMMODATION", name: "Pid Templem Hotel (Ivano-Frankivsk)", address: "Adjacent to the main synagogue, Ivano-Frankivsk, Ukraine", notes: "Small inn (11 rooms) opened 2010 next to the synagogue, reported as the first kosher hotel in western Ukraine. Confirm current kosher status/operation. ~1 hr from Dolyna.", source: "https://www.chabad.org/news/article_cdo/aid/1228753/jewish/First-Kosher-Hotel-Opens-in-Western-Ukraine.htm" },
      { category: "DRIVER", name: "Alex Dunai — Jewish heritage guide & driver (Lviv)", email: "dunai@dunai.lviv.ua", website: "https://alexdunai.com/guide", notes: "Long-established private guide/driver for Jewish roots and cemetery visits across western Ukraine, including Ivano-Frankivsk Oblast and Dolyna.", source: "https://alexdunai.com/guide" },
      { category: "AIRPORT", name: "Overland via Poland (Ukrainian airspace closed)", website: "https://visitukraine.today/blog/6572/how-to-get-to-ukraine-via-poland-slovakia-hungary-and-moldova", notes: "Ivano-Frankivsk (IFO) and Lviv (LWO) airports are closed to civilian flights. Fly to Rzeszów/Kraków (Poland), then overland by train/bus to Lviv, on to Ivano-Frankivsk, then ~1 hr to Dolyna.", source: "https://visitukraine.today/blog/6572/how-to-get-to-ukraine-via-poland-slovakia-hungary-and-moldova" },
    ],
    sourceUrl: "https://myshtetl.org/lvovskaja/dolyna.html",
  },
  {
    slug: "albertirsa",
    city: "Albertirsa (Irsa)",
    yiddishCity: "אירשא",
    name: "Albertirsa Jewish Cemetery",
    yiddishName: "בית החיים אירשא",
    country: "Hungary",
    address: "Akácfa u. 3-5, 2730 Albertirsa, Hungary",
    coordinates: "47.249750, 19.600972",
    arrivalNotes: [
      "Albertirsa is ~50 km SE of Budapest in Pest county; the cemetery is in the former village of Irsa, next to the Protestant cemetery.",
      "There is no Jewish community, kosher food, minyan, mikvah or lodging in Albertirsa today — plan on Budapest as your base. Budapest's Orthodox hub is the Kazinczy Street Synagogue complex (District VII), with the city's mikvah, a kosher slaughterhouse and kosher restaurants; Chabad of Budapest also runs a daily minyan, mikvah and kosher dining.",
      "The Jewish community of Alberti-Irsa was deported via the Monor ghetto to Auschwitz in July 1944, so the site today is primarily a historic community cemetery.",
    ],
    accessNote: "The cemetery is generally kept locked. Per the International Jewish Cemetery Project survey (2009), the key was held at Kossuth utca 9 in Albertirsa. This is old and should be re-confirmed locally before visiting.",
    accessContacts: [
      { label: "Cemetery key-holder (per IJCP survey — likely outdated)", note: "The cemetery survey records the key held locally on the same street — 'Gallo Jánosné, Akácfa utca 1' (an earlier survey noted Kossuth utca 9). No published phone; the caretaker is salaried by MAZSIHISZ. The reliable modern route is to arrange access via MAZSIHISZ / the Budapest Orthodox community before visiting." },
    ],
    burials: [
      { name: "Rabbi Chaim Kittsee (Schlesinger)", yiddishName: "רבי חיים קיצע", knownAs: "Baal Otzar Chaim", seforim: "אוצר חיים", yahrzeit: "Sivan · 1849", note: "Av Beis Din of Irsa from 1824 until his death; head of a large yeshiva and a signatory to the 1844 protest against the Reform conference. Burial in the Albertirsa cemetery is very likely (he died in office) but not explicitly stated in sources; the exact yahrzeit day is unconfirmed." },
    ],
    places: [
      { category: "KOSHER_FOOD", name: "Carmel Glatt Kosher Restaurant", address: "Kazinczy utca 31, 1075 Budapest, Hungary", website: "https://chabadhungary.com/en/food/92/", notes: "Long-established glatt kosher restaurant in District VII's Jewish Quarter, next to the Kazinczy St. Orthodox Synagogue. ~50 km NW of the Albertirsa cemetery — Budapest is the meal base.", source: "https://chabadhungary.com/en/food/92/" },
      { category: "KOSHER_FOOD", name: "Hanna Orthodox Kosher Restaurant", address: "Kazinczy utca 29-31, 1075 Budapest, Hungary", website: "https://chabadhungary.com/en/food/864/", notes: "Glatt kosher, Orthodox-supervised, inside the Kazinczy Street Synagogue courtyard. Traditional Hungarian-Jewish fare.", source: "https://chabadhungary.com/en/food/864/" },
      { category: "MINYAN", name: "Kazinczy Street Orthodox Synagogue", address: "Kazinczy utca 29-31, 1075 Budapest, Hungary", website: "https://en.wikipedia.org/wiki/Kazinczy_Street_Synagogue,_Budapest", notes: "Budapest's central Orthodox synagogue; the complex holds a daily minyan, the mikvah, a kosher butcher, kosher restaurants and schools — the Orthodox hub, ~50 km from Albertirsa.", source: "https://en.wikipedia.org/wiki/Kazinczy_Street_Synagogue,_Budapest" },
      { category: "MIKVAH", name: "Kazinczy Street Mikvah", address: "Kazinczy utca 16, 1075 Budapest, Hungary", notes: "Historic functioning mikvah of the Budapest Orthodox community, part of the Kazinczy complex. Confirm hours/appointment locally.", source: "https://www.triptobudapest.hu/sights/kazinczy-street-ortodox-synagogue/" },
      { category: "ACCOMMODATION", name: "King's Hotel (Budapest)", address: "Nagydiófa utca 25-27, 1072 Budapest, Hungary", notes: "In the District VII Jewish Quarter, walking distance to the Kazinczy synagogue/mikvah; Shabbat-friendly, with meals via the adjacent Salamon kosher restaurant. Practical base for a day trip to Albertirsa.", source: "https://www.gokosher.com/en/h99644" },
      { category: "DRIVER", name: "Budapest Jewish pilgrimage / kever transfers", website: "https://www.viplimobudapest.com/kerestir-pilgrimage", notes: "Private drivers (VIP Limo Budapest, Hungarian Jewish Tours) run pilgrimage transport from Budapest to countryside kevarim and can be chartered for a Budapest→Albertirsa day trip.", source: "https://www.viplimobudapest.com/kerestir-pilgrimage" },
      { category: "AIRPORT", name: "Budapest Ferenc Liszt International Airport (BUD)", website: "https://www.bud.hu/en", notes: "Main international gateway, ~35-40 km from Albertirsa (it sits SE of the city on the Cegléd side). Albertirsa is also reachable by MÁV train on the Budapest-Nyugati ⇄ Cegléd line (~60-75 min).", source: "https://en.wikipedia.org/wiki/Budapest_Ferenc_Liszt_International_Airport" },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/hungary/albertirsa",
  },
  {
    slug: "bardejov",
    city: "Bardejov",
    yiddishCity: "בארטפעלד",
    name: "Bardejov Jewish Cemetery",
    yiddishName: "בית החיים בארטפעלד",
    country: "Slovakia",
    address: "085 01 Bardejov, Slovakia",
    coordinates: "49.304056, 21.283694",
    arrivalNotes: [
      "The cemetery is on the northern edge of town, near the main road toward the spa suburb Bardejovské Kúpele (~2.5 km north of the center). It has an older part (oldest legible stone 1796) and a newer part, ~1,000 graves; restored and fenced in 2014.",
      "It is part of Bardejov's 'Jewish Suburbia' (Židovské predmestie) heritage complex, which also includes the Old Synagogue/Bet Hamidrash and the Bikur Cholim synagogue.",
      "Nearest major city and airport: Košice (~50 km). Nearest active Jewish infrastructure is in Košice — an Orthodox community with an active synagogue and the historic Zvonárska Street compound (mikveh, prayer hall, kosher facilities). Confirm minyan and kosher availability before relying on them.",
    ],
    accessNote: "The cemetery is fenced and locked; a local Bardejov resident holds a key and opens it on request, so visits must be arranged in advance. Contact the Bardejov Jewish Preservation Committee beforehand.",
    accessContacts: [
      { label: "Bardejov Jewish Preservation Committee (BJPC)", phone: "+1 626-773-8808", email: "info@bardejov.org", note: "Arrange cemetery, Jewish Suburbia and Bikur Cholim synagogue access in advance; a Bardejov resident holds the key. Office: 350 Cordova St., Pasadena, CA, USA." },
    ],
    burials: [
      { name: "Rabbi Moshe Halberstam", yiddishName: "רבי משה הלברשטאם", knownAs: "Of the Sanz (Halberstam) dynasty", yahrzeit: "1848–1903", note: "Buried in the ohel at the center of the cemetery together with his wife Rachel Fajga and his son." },
      { name: "Rabbi Yechiel Natan Halberstam", yiddishName: "רבי יחיאל נתן הלברשטאם", knownAs: "Son of Rabbi Moshe Halberstam", yahrzeit: "1866–1934", note: "Buried in the family ohel at the center of the cemetery." },
      { name: "Rabbi Chaim Avraham Orenstein", yiddishName: "רבי חיים אברהם אורנשטיין", knownAs: "Rabbi of Bardejov; student of the Chasam Sofer", seforim: "דברי אברהם", yahrzeit: "1871", note: "Rabbi of Bardejov 1856–1871; reported buried in the community cemetery. Exact grave and yahrzeit day unverified." },
    ],
    places: [
      { category: "MINYAN", name: "Jewish Community of Košice (ŽNO) — Orthodox synagogue", address: "Zvonárska 5 (entrance Krmanová 4), 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", website: "https://www.kehilakosice.sk/", notes: "Nearest active Orthodox community to Bardejov (~75 km). Minyan is most reliable during the academic year and uncertain in summer/holidays — arrange in advance.", source: "https://www.slovak-jewish-heritage.org/route-sites/kosice-zvonarska-street-orthodox-synagogue/" },
      { category: "MIKVAH", name: "Košice community mikvah", address: "Zvonárska 5 / Krmanová 4, 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", notes: "Historic mikvah within the Košice Orthodox compound; nearest mikvah for Bardejov pilgrims (~75 km). Contact the office before arrival.", source: "https://jguideeurope.org/en/region/slovakia/eastern-slovakia/kosice/" },
      { category: "KOSHER_FOOD", name: "Košice community kosher cafeteria & butcher", address: "Zvonárska 5 / Krmanová 4, 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", notes: "Kosher cafeteria and butcher in the Košice compound (~75 km). Do NOT assume walk-in service — pre-order/confirm with the office; there is no kosher restaurant in Bardejov itself.", source: "https://jguideeurope.org/en/region/slovakia/eastern-slovakia/kosice/" },
      { category: "ACCOMMODATION", name: "Bardejovské Kúpele spa-town hotels", website: "https://www.booking.com/spa/city/sk/bardejovske-kupele.html", notes: "Cluster of spa hotels/apartments ~5 km from Bardejov old town and the Jewish cemetery. None are kosher — self-cater or bring food from Košice.", source: "https://www.booking.com/spa/city/sk/bardejovske-kupele.html" },
      { category: "AIRPORT", name: "Košice International Airport (KSC)", website: "https://en.wikipedia.org/wiki/Ko%C5%A1ice_International_Airport", notes: "Nearest airport (~80 km to Bardejov). Direct links to Vienna, Bratislava and Warsaw; connect internationally via Vienna or Warsaw.", source: "https://www.flightconnections.com/flights-from-ko%C5%A1ice-ksc" },
      { category: "DRIVER", name: "Košice private transfers / drivers", website: "https://kosicetaxi24.sk/en/airport-transfers/", notes: "Local transfer companies (KošiceTaxi24, AIRTRANS.sk) run the Košice ⇄ Bardejov cemetery day trip (~75 km each way).", source: "https://kosicetaxi24.sk/en/airport-transfers/" },
    ],
    sourceUrl: "https://www.zidovskybardejov.sk/en/cintorin/",
  },
  {
    slug: "michalovce",
    city: "Michalovce (Nagymihály)",
    yiddishCity: "נאגימיהאלי",
    name: "Michalovce Jewish Cemetery",
    yiddishName: "בית החיים נאגימיהאלי",
    country: "Slovakia",
    address: "P. O. Hviezdoslava, 071 01 Michalovce, Slovakia",
    coordinates: "48.767000, 21.901694",
    arrivalNotes: [
      "The cemetery is on an isolated hillside on the suburban edge of Michalovce, reached by turning off a public road. A Jewish community has existed here since the 18th century (chevra kadisha founded 1792).",
      "Nearest major city and airport: Košice (~50 km west). Košice has the nearest active Jewish infrastructure — an Orthodox community on Puškinova/Zvonárska Street with a mikvah, kosher butcher and regular minyan, plus a Chabad presence. Kosher food, lodging and davening are best arranged in Košice.",
    ],
    accessNote: "Per the International Jewish Cemetery Project the cemetery is walled with a locking gate but described as 'open to all,' owned by the local Jewish community. No published on-site caretaker or hours were found — arrange access in advance through the regional contacts below.",
    accessContacts: [
      { label: "Slovak Jewish Heritage Center (Bratislava)", note: "Kozia 18, Bratislava; general Jewish-heritage contact and best first point to arrange a visit (slovak-jewish-heritage.org). Confirm details before relying on them." },
      { label: "Košice Jewish Community (Puškinova St. compound)", note: "Nearest active community; practical help for visitors, kosher, minyan and mikvah. No verified direct phone/email found — contact via the Slovak Jewish Heritage site." },
    ],
    burials: [
      { name: "Rabbi Aharon Greenberger", yiddishName: "רבי אהרן גרינברגער", knownAs: "Chief Rabbi (Av Beis Din) of Nagymihály", yahrzeit: "1811–1893", note: "Chief rabbi of Nagymihály for ~40 years; a disciple of the Chasam Sofer who inclined toward Chassidus. His tombstone is in the Michalovce cemetery." },
      { name: "Rabbi Simcha Greenberger", yiddishName: "רבי שמחה גרינברגער", knownAs: "Av Beis Din of Michalovce", yahrzeit: "d. c. 1909", note: "Son of R' Aharon; led the town's rabbinical court and a yeshiva. Local burial presumed but not explicitly stated in sources." },
      { name: "Rabbi Moshe Greenberger", yiddishName: "רבי משה גרינברגער", knownAs: "Dayan of Michalovce", yahrzeit: "d. c. 1931", note: "Son of R' Simcha; directed a yeshiva and served on the rabbinical court. Local burial presumed but not explicitly stated in sources." },
    ],
    places: [
      { category: "MINYAN", name: "Jewish Community of Košice (ŽNO) — Orthodox synagogue", address: "Zvonárska 5 (entrance Krmanová 4), 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", website: "https://www.kehilakosice.sk/", notes: "Nearest active minyan to Michalovce (~55 km); Michalovce itself no longer has a congregation. Minyan strongest in the academic year — coordinate ahead. The Košice office is also the practical route to arrange cemetery access.", source: "https://www.slovak-jewish-heritage.org/route-sites/kosice-zvonarska-street-orthodox-synagogue/" },
      { category: "MIKVAH", name: "Košice community mikvah", address: "Zvonárska 5 / Krmanová 4, 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", notes: "Historic mikvah in the Košice compound; nearest mikvah for Michalovce pilgrims (~55 km). Contact the office in advance.", source: "https://jguideeurope.org/en/region/slovakia/eastern-slovakia/kosice/" },
      { category: "KOSHER_FOOD", name: "Košice community kosher cafeteria & butcher", address: "Zvonárska 5 / Krmanová 4, 040 01 Košice, Slovakia", phone: "+421 55 62 59 059", email: "kancelaria@kehilakosice.sk", notes: "Kosher cafeteria and butcher in the Košice compound (~55 km). Pre-arrange/pre-order — do not rely on walk-in service; no kosher restaurant in Michalovce itself.", source: "https://jguideeurope.org/en/region/slovakia/eastern-slovakia/kosice/" },
      { category: "ACCOMMODATION", name: "Hotel Mousson, Michalovce", website: "https://www.booking.com/hotel/sk/mousson.en-gb.html", notes: "4-star hotel ~1.5 km from Michalovce train station — the closest full-service lodging to the cemetery. No kosher kitchen; central town hotels/apartments are also available.", source: "https://www.booking.com/hotel/sk/mousson.en-gb.html" },
      { category: "AIRPORT", name: "Košice International Airport (KSC)", website: "https://en.wikipedia.org/wiki/Ko%C5%A1ice_International_Airport", notes: "Nearest airport (~55-60 km). Direct links to Vienna, Bratislava and Warsaw; connect internationally via Vienna or Warsaw.", source: "https://www.flightconnections.com/flights-from-ko%C5%A1ice-ksc" },
      { category: "DRIVER", name: "Košice private transfers / drivers", website: "https://kosicetaxi24.sk/en/airport-transfers/", notes: "Local transfer companies (KošiceTaxi24, AIRTRANS.sk) run the Košice ⇄ Michalovce cemetery day trip (~55 km each way).", source: "https://kosicetaxi24.sk/en/airport-transfers/" },
    ],
    sourceUrl: "https://www.jewishgen.org/yizkor/Michalovce/mice003.html",
  },
  {
    slug: "uzhhorod",
    city: "Ungvar (Uzhhorod)",
    yiddishCity: "אונגוואר",
    name: "Ungvar Jewish Cemetery",
    yiddishName: "בית החיים אונגוואר",
    country: "Ukraine",
    address: "Kotlyarevs'koho St 5-7, Uzhhorod, Zakarpattia Oblast, Ukraine, 88000",
    coordinates: "48.635278, 22.312028",
    arrivalNotes: [
      "This is the old (historic) Jewish cemetery of Ungvar on Kotlyarevs'koho St., established in the 16th century, with graves dating 18th–20th century. Rabbi Shlomo Ganzfried's grave has an ohel built by the local Chabad community and is the cemetery's principal pilgrimage site.",
      "The Chabad Jewish Community of Uzhgorod (Rabbi Menachem Mendel Wilhelm, Ruskaya 36) runs the city's Jewish life, helps visitors locate graves, and offers kosher meals (reservations required) and a mikvah (Mikvah Mei Menachem). Contact them before visiting to arrange access.",
      "Ukraine is at war and its civil airspace has been closed since 2022; travelers routinely reach far-western Transcarpathia overland, with Košice (Slovakia) as the nearest international airport gateway. Confirm advisories and coordinate timing with the community.",
    ],
    accessNote: "The cemetery is enclosed by a masonry wall with a locking gate; the IJCP survey records access as open to all despite the gate. Given wartime conditions, arrange your visit in advance through the Uzhgorod Chabad community.",
    accessContacts: [
      { label: "Chabad Jewish Community of Uzhgorod — Rabbi Menachem Mendel Wilhelm", phone: "+380 50 945 8251", note: "Ruskaya 36, Uzhhorod. The community helps locate graves and advises on cemetery access, kosher food and mikvah. Phone surfaced via the official Chabad directory — verify before relying on it." },
    ],
    burials: [
      { name: "Rabbi Meir Eisenstadt", yiddishName: "רבי מאיר אייזנשטט", knownAs: "The Maharam Ash · Imrei Aish", seforim: "אמרי אש", yahrzeit: "כ״ד טבת · 1852", note: "Chief Rabbi (Av Beis Din) of Ungvar from 1835 until his death; early disciple of the Chasam Sofer and a leader of Hungarian Orthodoxy. Recorded among the notable rabbis buried in the Ungvar cemetery." },
      { name: "Rabbi Shlomo Ganzfried", yiddishName: "רבי שלמה גאנצפריד", knownAs: "Baal HaKitzur — author of the Kitzur Shulchan Aruch", seforim: "קיצור שולחן ערוך", yahrzeit: "כ״ח תמוז · 1886", note: "Born in Ungvar; dayan of the city from 1849 until his death. Buried in the old Ungvar cemetery, where the local Chabad community built an ohel over his grave — the cemetery's principal pilgrimage site." },
      { name: "Rabbi Menachem Eisenstadt", yiddishName: "רבי מנחם אייזנשטט", knownAs: "Menachem Ash — successor to the Maharam Ash", yahrzeit: "1863", note: "Succeeded his father as rabbi of Ungvar. Burial in Ungvar is likely but not separately confirmed by a source naming his grave." },
    ],
    places: [
      { category: "MINYAN", name: "Chabad Jewish Community of Uzhgorod", address: "vul. Ruskaya 36, Uzhhorod 88000, Ukraine", phone: "+380509458251", email: "chabaduzhgorod@gmail.com", notes: "Active synagogue/community (Rabbi Menachem Mendel Wilhelm) a few km from the old cemetery — the practical base for pilgrims to the Ganzfried ohel. Confirm minyan times in advance, especially in wartime.", source: "https://www.chabad.org/jewish-centers/249713/Uzhgorod/Synagogue/Jewish-Community-of-Uzhgorod" },
      { category: "KOSHER_FOOD", name: "Kosher meals — Chabad of Uzhgorod", address: "vul. Ruskaya 36, Uzhhorod 88000, Ukraine", phone: "+380509458251", email: "chabaduzhgorod@gmail.com", notes: "Kosher meals by advance reservation — essentially the only reliable kosher food in the Uzhhorod area. Arrange before arrival.", source: "https://www.chabad.org/jewish-centers/249713/Uzhgorod/Synagogue/Jewish-Community-of-Uzhgorod" },
      { category: "MIKVAH", name: "Mikvah Mei Menachem (Chabad Uzhgorod)", address: "Uzhhorod (Chabad community, vul. Ruskaya 36 area)", phone: "+380509458251", notes: "Community mikvah; contact the Uzhgorod Chabad to arrange use.", source: "https://www.chabad.org/jewish-centers/249713/Uzhgorod/Synagogue/Jewish-Community-of-Uzhgorod" },
      { category: "ACCOMMODATION", name: "Uzhhorod city hotels", notes: "No kosher-certified hotel is documented; lodge in standard city hotels and coordinate kosher food/Shabbat through Chabad. Mukachevo (~40 km) is an alternative base with its own Jewish community.", source: "https://www.tripadvisor.com/Hotels-g2693145-Zakarpattia_Oblast-Hotels.html" },
      { category: "AIRPORT", name: "Košice International Airport (KSC), Slovakia", notes: "Standard overland gateway during the war (Uzhhorod's airport is not in commercial use). ~100 km / ~1h45 to the Vyšné Nemecké–Uzhhorod border crossing; expect variable border waits.", source: "https://www.rome2rio.com/s/Kosice-Airport-KSC/Uzhhorod" },
      { category: "TRANSPORT", name: "Košice ⇄ Uzhhorod bus / private transfer", notes: "A direct cross-border bus runs Košice ⇄ Uzhhorod (~1h50, a few days/week — verify), and private car transfers between Košice Airport and Uzhhorod are bookable.", source: "https://www.rome2rio.com/s/Kosice-Airport-KSC/Uzhhorod" },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/ukraine/uzhhorod-transcarpathia",
  },
  {
    slug: "kisvarda",
    city: "Kisvárda (Kleinwardein)",
    yiddishCity: "קליינווארדיין",
    name: "Kisvárda Jewish Cemetery",
    yiddishName: "בית החיים קליינווארדיין",
    country: "Hungary",
    address: "Akácfa utca (corner of Wesselényi utca), 4600 Kisvárda, Hungary",
    coordinates: "48.217, 22.083",
    arrivalNotes: [
      "Kisvárda is in NE Hungary (Szabolcs-Szatmár-Bereg), ~44 km NE of Nyíregyháza and ~84 km from Debrecen. The cemetery has a Holocaust memorial (2005); a heritage foundation re-erected ~700 tombstones and built a perimeter fence.",
      "There is no kosher infrastructure in Kisvárda itself. The nearest Jewish-travel hub is the Tokaj/Kerestir region to the west: Bodrogkeresztúr (Kerestir) has Reb Shayele's Guest House with kosher meals, lodging, a shul and mikvaos year-round.",
      "The other major regional ohel is the Yismach Moshe (R' Moshe Teitelbaum) in Sátoraljaújhely. Nearest airport is Debrecen (~84 km); Budapest is the main long-haul gateway.",
    ],
    accessNote: "The cemetery is enclosed and kept locked. Per the IJCP survey it has a caretaker who lives by the entrance and unlocks the gate on request; this survey data is decades old and should be re-confirmed locally before travelling.",
    accessContacts: [
      { label: "Cemetery caretaker (per IJCP survey — likely outdated)", note: "Recorded as Jánosné Lovász at Árpád utca 4, by the entrance. No published phone/email; confirm via the regional (Nyíregyháza) Jewish community or MAZSIHISZ before relying on it." },
    ],
    burials: [
      { name: "Rabbi Naftali Schreiber", yiddishName: "רבי נפתלי שרייבער", knownAs: "The Mateh Naftali; Dayan of Kisvárda", seforim: "מטה נפתלי", yahrzeit: "1836–1913", note: "Dayan of Kisvárda until his death there in 1913. Burial in the Kisvárda cemetery is likely but not explicitly stated in sources." },
      { name: "Rabbi Moshe Tzvi Landau", yiddishName: "רבי משה צבי לנדא", knownAs: "Rosh Yeshiva of Kleinwardein", yahrzeit: "from 1905", note: "Son-in-law of R' Naftali Schreiber; dayan and rosh yeshiva in Kisvárda, whose students included the future Klausenberger Rebbe. Grave location not confirmed in a public source." },
    ],
    places: [
      { category: "KOSHER_FOOD", name: "Chabad of Debrecen (kosher food / community)", address: "Pásti utca area, Debrecen, Hungary", website: "https://www.chabad.org/jewish-centers/location/1-1321/Debrecen-Hungary", notes: "Nearest organized community with kosher food, mikvah and minyan resources (~95 km / ~1.5 hr). Rabbi Shmuel Faigen; arrange kosher meals in advance.", source: "https://www.totallyjewishtravel.com/Kosher_Tours-TL7736-debrecen_hungary-Vacations.html" },
      { category: "MIKVAH", name: "Debrecen mikvah", address: "Debrecen, Hungary", notes: "Closest listed mikvah to Kisvárda (~95 km, via the Debrecen community). No mikvah in Kisvárda or Nyíregyháza; verify hours/access ahead.", source: "https://www.totallyjewishtravel.com/mikvahsearch-TJ7736-Debrecen_Hungary-Mikveh_Immersion_Tvilah.html" },
      { category: "MINYAN", name: "Nyíregyháza Synagogue (Orthodox)", address: "Nyíregyháza, Hungary", notes: "Closest operating synagogue to Kisvárda (~40 km). 'Operating' does not guarantee a daily minyan — confirm in advance.", source: "https://en.wikipedia.org/wiki/Ny%C3%ADregyh%C3%A1za_New_Synagogue" },
      { category: "ACCOMMODATION", name: "Reb Shayele's Guest House (Kerestir)", address: "Kossuth Lajos u. 67, Bodrogkeresztúr, Hungary", phone: "+1-347-314-4193", email: "reservations@rebshayele.org", website: "https://rebshayele.org/", notes: "Regional kosher lodging + meals + shul + mikvah base; Kisvárda is often done as a day trip from Kerestir (~67 km).", source: "https://rebshayele.org/" },
      { category: "AIRPORT", name: "Debrecen International Airport (DEB)", website: "https://en.wikipedia.org/wiki/Debrecen_International_Airport", notes: "Nearest airport (~95 km). Budapest (BUD, ~300 km) is the main international gateway; most pilgrims route via Budapest and the Kerestir base.", source: "https://en.wikipedia.org/wiki/Debrecen_International_Airport" },
    ],
    sourceUrl: "https://www.iajgsjewishcemeteryproject.org/hungary/kisvarda.html",
  },
  {
    slug: "lviv-old",
    city: "Lemberg (Lviv)",
    yiddishCity: "לעמבערג",
    name: "Lviv Old Jewish Cemetery",
    yiddishName: "בית החיים הישן לעמבערג",
    country: "Ukraine",
    address: "Lviv, Lviv Oblast, Ukraine, 79000",
    coordinates: "49.84488, 24.01679",
    arrivalNotes: [
      "The historic Old Jewish Cemetery (first documented 1414) was destroyed under Nazi occupation; its matzevos were carted off and the Krakivskyi (Krakowski) Market was built over the site in 1947. The market still occupies the ground — there is no functioning cemetery, no rows of graves, and no marked individual kever to visit.",
      "Visitors come to daven and say Tehillim over the kevarim of the tzaddikim on the ground of the destroyed beis hachayim rather than at a marked grave. A community-organized 350th hilula of the Taz was held on the market grounds in 2017.",
      "Active Jewish life in Lviv: the Tsori Gilod (Beis Aharon V'Yisrael) Synagogue is the remaining functioning shul; a community group led by Meylakh Sheykhet meets near the Golden Rose / Space of Synagogues, where a small kosher canteen can provide meals; Chabad also operates in Lviv. Confirm minyan, kashrus and mikvah before relying on them.",
      "Nearest airport is Lviv (LWO); commercial flights are suspended while Ukrainian airspace is closed, so travelers generally enter overland from Poland. Wartime advisories apply.",
    ],
    accessNote: "The site is fully open and public — but it is a working outdoor market, not a cemetery. The Old Jewish Cemetery was obliterated in WWII and paved over; no ohel, headstone or preserved section of the tzaddikim exists on the site, and no individual grave (including the Taz's) has been recovered or re-marked. There is no gated kever to enter.",
    accessContacts: [
      { label: "Tsori Gilod (Beis Aharon V'Yisrael) Synagogue", phone: "+380 322 383 804", note: "4 Brativ Mikhnovskykh St., Lviv; the city's functioning synagogue and a practical contact point for the Jewish community. Phone from public listings — verify before relying on it." },
    ],
    burials: [
      { name: "Rabbi David HaLevi Segal", yiddishName: "רבי דוד הלוי סג״ל", knownAs: "The Taz — Turei Zahav", seforim: "טורי זהב · דברי דוד", yahrzeit: "כ״ו שבט · 1667", note: "Rav and rosh yeshiva of Lemberg. Buried in the Old Jewish Cemetery; his grave was destroyed with the cemetery and lies under the Krakivskyi Market." },
      { name: "Rabbi Yehoshua ben Alexander HaCohen Falk", yiddishName: "רבי יהושע פאלק", knownAs: "The Sma — Meiras Einayim", seforim: "ספר מאירת עינים · דרישה ופרישה", yahrzeit: "י״ט ניסן · 1614", note: "Rosh yeshiva in Lemberg; among the rabbanim interred in the Old Jewish Cemetery." },
      { name: "Rabbi Tzvi Hirsch Ashkenazi", yiddishName: "רבי צבי הירש אשכנזי", knownAs: "The Chacham Tzvi", seforim: "שו״ת חכם צבי", yahrzeit: "1718", note: "Served briefly as chief rabbi of Lemberg before his passing; documented among those buried in the Old Jewish Cemetery." },
      { name: "Rabbi Yaakov Meshullam Ornstein", yiddishName: "רבי יעקב משולם אורנשטיין", knownAs: "Yeshuos Yaakov", seforim: "ישועות יעקב", yahrzeit: "1839", note: "Rav of Lemberg; among the rabbanim interred in the Old Jewish Cemetery." },
      { name: "Rabbi Chaim HaCohen Rappaport", yiddishName: "רבי חיים הכהן רפפורט", knownAs: "Rav of Lemberg", yahrzeit: "1771", note: "Chief rabbi of Lemberg; listed among the scholars interred in the Old Jewish Cemetery." },
      { name: "The Reizes brothers — Chaim and Yehoshua", yiddishName: "האחים ראייזעס", knownAs: "Kedoshim / martyrs of Lviv (1728)", yahrzeit: "1728", note: "Brothers executed al kiddush Hashem in 1728; interred in the Old Jewish Cemetery." },
    ],
    places: [
      { category: "MINYAN", name: "Tsori Gilod Synagogue (Beis Aharon V'Yisrael)", address: "4 Brativ Mikhnovskykh St., Lviv 79018, Ukraine", notes: "The only functioning Orthodox synagogue in Lviv; operates daily for the community — the practical minyan address for visitors to the old-cemetery site. Confirm current wartime service times locally.", source: "https://en.wikipedia.org/wiki/Tsori_Gilod_Synagogue" },
      { category: "MIKVAH", name: "Mikvah at the Tsori Gilod Synagogue", address: "4 Brativ Mikhnovskykh St., Lviv 79018, Ukraine", notes: "A mikvah operates on-site at the functioning synagogue. No published hours — arrange in advance via the community.", source: "https://en.wikipedia.org/wiki/Tsori_Gilod_Synagogue" },
      { category: "KOSHER_FOOD", name: "Kosher kitchen at the Tsori Gilod Synagogue", address: "4 Brativ Mikhnovskykh St., Lviv 79018, Ukraine", notes: "Kosher kitchen tied to the active shul — the most reliable kosher option. Arrange meals in advance rather than assuming walk-in service.", source: "https://lia.lvivcenter.org/en/objects/cori-gilod-synagogue/" },
      { category: "KOSHER_FOOD", name: "Kosher canteen by the Golden Rose / Space of Synagogues", address: "Staroyevreiska St. area (Space of Synagogues), Lviv", notes: "A small kosher canteen near the Golden Rose ruins has been reported able to provide kosher meals to visitors. IMPORTANT: the adjacent themed restaurant 'At the Golden Rose' is NOT kosher — do not confuse them. Verify current operation on arrival.", source: "https://www.jta.org/2016/04/03/lifestyle/reporters-notebook-a-crazy-night-at-lvivs-controversial-jewish-eatery" },
      { category: "ACCOMMODATION", name: "Old Town hotels near the Space of Synagogues", notes: "No certified kosher hotel in Lviv is documented. Stay in the Old Town within walking distance of the Space of Synagogues and Tsori Gilod shul, and self-cater or arrange kosher meals via the community; confirm Shabbat accommodations with the property.", source: "https://www.tripadvisor.com/HotelsNear-g295377-d17826632-The_Space_of_Synagogues-Lviv_Lviv_Oblast.html" },
      { category: "TRANSPORT", name: "Overland rail from Poland (Przemyśl / Kraków / Warsaw → Lviv)", notes: "Primary way in while flights are suspended. Przemyśl Główny is the main gateway; direct and connecting trains run to Lviv (allow 2+ hrs for border control). Book ~30 days ahead.", source: "https://www.seat61.com/international-trains/trains-from-Kyiv.htm" },
      { category: "AIRPORT", name: "Lviv Danylo Halytskyi Airport (LWO) — closed to civilian flights", website: "https://www.lwo.aero/en", notes: "Do not plan to fly in: Ukrainian civil airspace has been closed since Feb 2022 and no civilian flights operate. Enter overland from Poland (see transport). Wartime advisories apply.", source: "https://en.wikipedia.org/wiki/Lviv_Danylo_Halytskyi_International_Airport" },
    ],
    sourceUrl: "https://lia.lvivcenter.org/en/objects/old-jewish-cemetery/",
  },
  {
    slug: "mizhhirya",
    city: "Maidan / Mizhhirya (Volova)",
    yiddishCity: "וואלאווע",
    name: "Maidan Guest House & Mizhhirya (Volova) Kever",
    yiddishName: "בית החיים וואלאווע",
    country: "Ukraine",
    address: "Maidan Guest House, vul. Verkhovynska 56, Maidan, Zakarpattia Oblast, Ukraine, 90024",
    coordinates: "48.605444, 23.481472",
    arrivalNotes: [
      "This Carpathian area (Mizhhirya hromada, Zakarpattia) had a large pre-war Jewish population and was a seat of a Teitelbaum Hasidic branch (the Volover Rav). The documented regional kever site is the Mizhhirya (Volova/Volové) Jewish cemetery at the Suvorova/Leonova crossroads (~64 gravestones, some renovated), ~10 km from Maidan.",
      "Lodging base: the Maidan Guest House at vul. Verkhovynska 56, Maidan. Note: this guest house could not be independently verified in public listings — confirm its details, kosher status and booking directly before relying on it.",
      "Nearest towns are Mizhhirya (~10 km) and Khust; regional airports at Uzhhorod/Mukachevo are limited during wartime, with Košice (Slovakia) the common overland gateway. Ukraine wartime advisories apply.",
    ],
    accessNote: "A small village-area cemetery; current gate/caretaker status is not documented in public sources. Confirm access locally or via a regional heritage contact before traveling.",
    burials: [
      { name: "Rabbi Hayim Shalom Landa", yiddishName: "רבי חיים שלום לאנדא", knownAs: "Dayan and moreh tzedek of Mizhhirya", yahrzeit: "1924", note: "His renovated tomb is among the notable graves in the Mizhhirya (Volova) cemetery." },
      { name: "Rabbi Yisroel Yaakov Yoikel Teitelbaum", yiddishName: "רבי ישראל יעקב יואל טייטלבוים", knownAs: "Rabbi/dayan of the Teitelbaum line (Berbeshti, Gorlice, Mizhhirya)", note: "Among the renovated tombs recorded in the Mizhhirya cemetery." },
    ],
    places: [
      { category: "ACCOMMODATION", name: "Hotel-Restaurant \"Duet\", Maidan", address: "vul. Verkhovynska 24a, s. Maidan, Mizhhirya raion, Zakarpattia", website: "https://duet-hotel.com/", notes: "Secular Carpathian resort hotel-restaurant (~8 rooms) in Maidan, ~10 km from Mizhhirya town. NOT kosher — the nearest verifiable public lodging to the Mizhhirya cemetery. Bring/arrange kosher provisions.", source: "https://duet-hotel.com/" },
      { category: "ACCOMMODATION", name: "Recreation complex \"ZRUB\", Maidan", address: "vul. Verkhovynska 36, s. Maidan, Mizhhirya raion, Zakarpattia", notes: "Two-story guest house (~4 rooms) on the same street, ~10 km from Mizhhirya. Secular, NOT kosher. (The 'Maidan Guest House' at #56 could not be verified in any public listing — confirm directly.)", source: "https://turizm-karpaty.com.ua/vidpochinkovij-kompleks-zrub-majdan/" },
      { category: "KOSHER_FOOD", name: "Kosher food via Uzhhorod Chabad (~130+ km)", notes: "No kosher food in the Mizhhirya/Maidan area. Nearest is the Uzhhorod Chabad community (kosher meals by reservation), ~130-155 km / ~2.5 hr away. Bring provisions.", source: "https://www.chabad.org/jewish-centers/249713/Uzhgorod/Synagogue/Jewish-Community-of-Uzhgorod" },
      { category: "AIRPORT", name: "Košice International Airport (KSC), Slovakia", notes: "Overland gateway: Košice → Uzhhorod border, then ~130-155 km / ~2h40 onward drive to Mizhhirya/Maidan. Plan a full travel day; no direct public transit to the village.", source: "https://www.rome2rio.com/s/Mizhhirya/Uzhhorod" },
      { category: "TRANSPORT", name: "Uzhhorod → Mizhhirya road connection", notes: "Reached by road from Uzhhorod (~132-154 km, ~2h30-2h40 via mountain highways). A private car/driver is the practical option; no kosher/Jewish transport specific to this route is documented.", source: "https://www.rome2rio.com/s/Mizhhirya/Uzhhorod" },
    ],
    sourceUrl: "https://cja.huji.ac.il/browser.php?mode=set&id=48428",
  },
];

const cemeteryNames: Record<string, { name: string; yiddishName: string }> = {
  uman: { name: "Tziyun of Rebbe Nachman", yiddishName: "ציון רבינו נחמן מברסלב" },
  medzhybizh: { name: "Medzhybizh Old Jewish Cemetery", yiddishName: "בית החיים הישן מעזשיבוזש" },
  belz: { name: "Belz Jewish Cemetery", yiddishName: "בית החיים בעלז" },
  preshburg: { name: "Chatam Sofer Memorial", yiddishName: "ציון החתם סופר בפרעשבורג" },
  kerestir: { name: "Kerestir Jewish Cemetery", yiddishName: "בית החיים קערעסטיר" },
  munkatch: { name: "Munkatch Old Jewish Cemetery", yiddishName: "בית החיים הישן מונקאטש" },
  rymanow: { name: "Rymanow Jewish Cemetery", yiddishName: "בית החיים רימינוב" },
  dynow: { name: "Dynów Jewish Cemetery", yiddishName: "בית החיים דינוב" },
  sanz: { name: "Sanz New Jewish Cemetery", yiddishName: "בית החיים החדש צאנז" },
  ijhel: { name: "Ijhel Old Jewish Cemetery", yiddishName: "בית החיים הישן איהעל" },
  liska: { name: "Liska Jewish Cemetery", yiddishName: "בית החיים ליסקא" },
};

const guideCemeteries: Cemetery[] = cityGuides
  .filter((guide) => guide.graveAddress && cemeteryNames[guide.slug])
  .map((guide) => ({
    slug: guide.slug,
    city: guide.city,
    yiddishCity: guide.yiddishCity,
    name: cemeteryNames[guide.slug].name,
    yiddishName: cemeteryNames[guide.slug].yiddishName,
    country: guide.country,
    address: guide.graveAddress!,
    coordinates: guide.graveCoordinates,
    arrivalNotes: guide.findingNotes ?? ["Use the exact map pin and confirm current cemetery access before leaving for the kever."],
    accessContacts: guide.accessContacts ?? (guide.accessContact ? [guide.accessContact] : undefined),
    accessNote: (guide.accessContacts?.length || guide.accessContact)
      ? "Current public shomer / cemetery-access contacts are listed below. Please confirm access before traveling."
      : "A current public שומר / cemetery-access number has not yet been verified for this בית החיים. Confirm access before traveling.",
    burials: [{
      name: guide.tzaddik,
      yiddishName: guide.yiddishTzaddik,
      seforim: guide.seforim,
      yahrzeit: `${guide.yahrzeit} · ${guide.niftar}`,
    }],
    sourceUrl: guide.sourceUrl,
  }));

export const cemeteries: Cemetery[] = [...featuredCemeteries, ...guideCemeteries, ...bulkCemeteries, ...bulkCemeteries2, ...bulkCemeteries3, ...bulkCemeteries4, ...bulkCemeteries5, ...bulkCemeteries6, ...bulkCemeteries7, ...bulkCemeteries8, ...bulkCemeteries9];

export function getCemetery(slug: string) {
  return cemeteries.find((cemetery) => cemetery.slug === slug);
}
import { cityGuides } from "@/data/destinations-detailed";
import { bulkCemeteries } from "@/data/cemeteries-bulk";
import { bulkCemeteries2 } from "@/data/cemeteries-bulk-2";
import { bulkCemeteries3 } from "@/data/cemeteries-bulk-3";
import { bulkCemeteries4 } from "@/data/cemeteries-bulk-4";
import { bulkCemeteries5 } from "@/data/cemeteries-bulk-5";
import { bulkCemeteries6 } from "@/data/cemeteries-bulk-6";
import { bulkCemeteries7 } from "@/data/cemeteries-bulk-7";
import { bulkCemeteries8 } from "@/data/cemeteries-bulk-8";
import { bulkCemeteries9 } from "@/data/cemeteries-bulk-9";
import type { ContentPlace } from "@/data/practical-content";
