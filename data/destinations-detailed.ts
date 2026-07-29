export type CityGuide = {
  slug: string;
  city: string;
  yiddishCity: string;
  country: string;
  tzaddik: string;
  yiddishTzaddik: string;
  aliases?: string[];
  overview: string;
  seforim: string;
  yahrzeit: string;
  niftar: string;
  graveAddress?: string;
  graveCoordinates?: string;
  findingNotes?: string[];
  accessContact?: {
    label: string;
    phone?: string;
    email?: string;
    note: string;
  };
  accessContacts?: Array<{
    label: string;
    phone?: string;
    email?: string;
    note: string;
  }>;
  safetyNote?: string;
  /**
   * Others buried in the same bais hachaim.
   *
   * A city guide names the tzaddik the town is known for, and until now the
   * kever page built from it could show only that one name — not because the
   * ground holds one kever, but because the mapping hardcoded an array of one.
   * Somebody standing in Medzhybizh saw the Baal Shem Tov and nothing about the
   * Apter Rov a few paces away.
   *
   * Only people a source actually places in THIS ground belong here.
   */
  alsoBuried?: Array<{
    name: string;
    yiddishName: string;
    knownAs?: string;
    seforim?: string;
    yahrzeit?: string;
    note?: string;
  }>;
  sourceUrl: string;
};

export const cityGuides: CityGuide[] = [
  {
    slug: "uman",
    city: "Uman",
    yiddishCity: "אומאן",
    country: "Ukraine",
    tzaddik: "Rebbe Nachman of Breslov",
    yiddishTzaddik: "רבינו נחמן מברסלב",
    aliases: ["אומן", "Breslov", "ברסלב"],
    overview: "Rebbe Nachman, founder of Breslov Chassidus, is buried in Uman. His teachings continue to guide generations through emunah, simchah, tefillah, and personal growth.",
    seforim: "ליקוטי מוהר״ן · סיפורי מעשיות · ספר המידות",
    yahrzeit: "י״ח תשרי",
    niftar: "תקע״א / 1810",
    graveAddress: "Pushkina St 27A, Uman, Cherkasy Oblast, Ukraine, 20300",
    graveCoordinates: "48.7487, 30.2231",
    findingNotes: [
      "Set navigation to Pushkina Street 27A; the tziyun is on Pushkina Street.",
      "From central Uman, the route approaches from the direction of Sofiyivka Park and continues along Pushkina Street.",
      "During Rosh Hashanah and other busy periods, follow current local crowd-control and security directions rather than relying on a usual walking route.",
          "The tziyun is not the whole of what is here. This ground holds the kedoshim of 1768 — more than twenty thousand of them — and Rebbe Nachman chose it for that reason. It is worth knowing where you are standing before Rosh Hashana crowds fill it.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    alsoBuried: [
      {
        name: "The kedoshim of Uman, 5528",
        yiddishName: "קדושי אומאן תקכ״ח",
        knownAs: "More than twenty thousand murdered in 1768",
        note: "Killed on 5–7 Tammuz 1768 by Gonta's Haidamaks, who offered them their lives to convert and were refused. They are buried in this ground, and Rebbe Nachman asked to be buried among them — he had passed through Uman and said of it, this is a good place to be buried.",
      },
    ],
    sourceUrl: "https://www.breslov.com/center/article_rebyahrzeit.html",
  },
  {
    slug: "medzhybizh",
    city: "Medzhybizh",
    yiddishCity: "מעזשיבוזש",
    country: "Ukraine",
    tzaddik: "Rabbi Yisrael Baal Shem Tov",
    yiddishTzaddik: "דער בעל שם טוב",
    aliases: ["Mezhibuzh", "מז'יבוז'", "בעש"],
    overview: "The Baal Shem Tov, known as the Besht and regarded as the founder of Chassidus, lived in Medzhybizh and is buried there.",
    seforim: "כתר שם טוב · צוואת הריב״ש",
    yahrzeit: "ו׳ סיון · שבועות",
    niftar: "תק״ך / 1760",
    graveAddress: "Baal Shem Tova St 24, Medzhybizh, Khmelnytskyi Oblast, Ukraine",
    graveCoordinates: "49.440896, 27.404349",
    findingNotes: [
      "The ohel is in Medzhybizh's old Jewish cemetery, on Baal Shem Tova Street.",
      "The cemetery is north of the Medzhybizh Fortress; published local directions describe it as roughly four blocks north of the fortress.",
      "Once inside the cemetery, look for the ohel over the Baal Shem Tov's kever.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    alsoBuried: [
      {
        name: "Rabbi Avraham Yehoshua Heshel of Apta",
        yiddishName: "רבי אברהם יהושע העשיל מאפטא",
        knownAs: "The Apter Rov — the Ohev Yisroel",
        seforim: "אוהב ישראל",
        note: "1748–1825. He moved to Medzhybizh in 1813 and asked to be buried near the Baal Shem Tov; his ohel stands a few paces from it. He signed himself Ohev Yisroel, and the sefer carries the name.",
      },
      {
        name: "Rabbi Ze'ev Wolf Kitzes",
        yiddishName: "רבי זאב װאלף קיצס",
        knownAs: "Talmid of the Baal Shem Tov",
        note: "Circa 1685–1788. One of the Baal Shem Tov's closest talmidim in Medzhybizh, and buried beside him.",
      },
    ],
    sourceUrl: "https://encyclopedia.yivo.org/article.aspx/Baal_Shem_Tov",
  },
  {
    slug: "belz",
    city: "Belz",
    yiddishCity: "בעלז",
    country: "Ukraine",
    tzaddik: "Rabbi Shalom Rokeach, the Sar Shalom",
    yiddishTzaddik: "דער שר שלום מבעלז",
    aliases: ["Bełz", "שר שלום"],
    overview: "The Sar Shalom was the first Belzer Rebbe and founder of the Belz dynasty, whose leadership shaped the town into a major Chassidic center.",
    seforim: "דובר שלום",
    yahrzeit: "כ״ז אלול",
    niftar: "תרט״ו / 1855",
    graveAddress: "Belz Jewish Cemetery, opposite 47 Mitskevycha Street, Belz, Ukraine",
    graveCoordinates: "50.38310, 23.99170",
    findingNotes: [
      "Navigate to the cemetery opposite 47 Mitskevycha Street in Belz.",
      "The ohel containing the Sar Shalom's tziyun is outside the cemetery fence.",
      "Confirm current gate and access arrangements before traveling, as cemetery access can change.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    alsoBuried: [
      {
        name: "Rabbi Yehoshua Rokeach",
        yiddishName: "רבי יהושע רוקח",
        knownAs: "The Mittler Rov — second Belzer Rebbe",
        note: "1825–1894. Son of the Sar Shalom and Belzer Rebbe from 1856 until his petirah.",
      },
      {
        name: "Rabbi Yissachar Dov Rokeach",
        yiddishName: "רבי יששכר דוב רוקח",
        knownAs: "The third Belzer Rebbe",
        note: "1854–1926. Belzer Rebbe from his father's petirah in 1894. The kevarim of all three — the Sar Shalom, the Mittler Rov and him — were restored in 2015.",
      },
    ],
    sourceUrl: "https://worldofbelz.org/history/the-holy-sar-shalom/",
  },
  {
    slug: "lelov",
    city: "Lelov",
    yiddishCity: "לעלוב",
    country: "Poland",
    tzaddik: "Rabbi Dovid Biderman of Lelov",
    yiddishTzaddik: "רבי דוד מלעלוב",
    aliases: ["Lelów", "לעלאוו"],
    overview: "Reb Dovid of Lelov founded the Lelov dynasty. He is remembered for his ahavas Yisrael and was a disciple of Reb Elimelech of Lizhensk and the Chozeh of Lublin.",
    seforim: "תורות וסיפורים של בית לעלוב",
    yahrzeit: "ז׳ שבט",
    niftar: "תקע״ד / 1814",
    sourceUrl: "https://hasidut.herzog.ac.il/en/story/rabbi-david-of-lelov-cannot-answer-the-lubliner/",
  },
  {
    slug: "ropshitz",
    city: "Łańcut (Ropshitz)",
    yiddishCity: "לאַנצוט (ראפשיץ)",
    country: "Poland",
    tzaddik: "Rabbi Naftali Tzvi Horowitz of Ropshitz",
    yiddishTzaddik: "דער ראפשיצער רב",
    aliases: ["Ropczyce", "Łańcut", "Lancut", "לאנצוט", "לאַנצוט", "ראפשיץ"],
    overview: "The Ropshitzer Rav was a leading Galician Rebbe, known for depth, warmth, and sharp insight. His kever is in Łańcut, Poland.",
    seforim: "זרע קודש · אילה שלוחה · אמרי שפר",
    yahrzeit: "י״א אייר",
    niftar: "תקפ״ז / 1827",
    sourceUrl: "https://nertzaddik.com/tzadik-info?id=3506",
  },
  {
    slug: "preshburg",
    city: "Preshburg (Bratislava)",
    yiddishCity: "פרעשבורג",
    country: "Slovakia",
    tzaddik: "Rabbi Moshe Sofer, the Chatam Sofer",
    yiddishTzaddik: "דער חתם סופר",
    aliases: ["Bratislava", "Pressburg", "חתם סופר", "פרשבורג"],
    overview: "The Chatam Sofer was the revered Rav of Preshburg and one of the foremost Torah leaders of his generation. His preserved gravesite is an essential stop for visitors to the historic Preshburg kehillah.",
    seforim: "שו״ת חתם סופר · חידושי תורת משה",
    yahrzeit: "כ״ה תשרי",
    niftar: "תר״ס / 1839",
    graveAddress: "Nábrežie armádneho generála Ludvíka Svobodu 22, 811 02 Bratislava, Slovakia",
    graveCoordinates: "48°08'30.8\"N 17°05'29.7\"E",
    findingNotes: [
      "Set navigation to the Chatam Sofer Memorial at the address above; it preserves the central section of Preshburg's historic Jewish cemetery.",
      "The memorial is a dedicated underground site near the Danube embankment, rather than an open cemetery visit.",
      "Confirm current opening and entry arrangements before travel, especially for a group or a yahrzeit visit.",
          "What survives is underground and is only the rabbinic section: twenty-three kevarim, the Chasam Sofer's and twenty-two around it. The rest of the Preshburg cemetery was destroyed in 1943–44 when a road tunnel was cut through the hill, and those kevarim were moved elsewhere. Do not go looking on the surface for a family matzeivah — it is not there.",
    ],
    accessContact: {
      label: "Chatam Sofer Memorial reservations",
      phone: "+421 948 554 442",
      email: "memorial@znoba.sk",
      note: "Entry is by advance reservation. This is the official memorial booking contact, not a general local phone line.",
    },
    alsoBuried: [
      // The memorial is not the Chasam Sofer alone. It is the rabbinic section
      // of the old Pressburg cemetery — twenty-two kevarim around his, the men
      // who held the town before him.
      {
        name: "Rabbi Meshulam Igra of Tysmenitsa",
        yiddishName: "רבי משולם איגרא",
        knownAs: "Rov of Preshburg before the Chasam Sofer",
        note: "1742–1801. Rov of Preshburg in the years directly before the Chasam Sofer took the town.",
      },
      {
        name: "Rabbi Meir Barby",
        yiddishName: "רבי מאיר ברבי",
        knownAs: "Rov of Preshburg",
        note: "Circa 1725–1789. Rov of Preshburg and rosh yeshiva there, from Halberstadt.",
      },
    ],
    sourceUrl: "https://www.chabad.org/library/article_cdo/aid/455336/jewish/Rabbi-Moses-Sofer.htm",
  },
  {
    slug: "kerestir",
    city: "Kerestir (Bodrogkeresztúr)",
    yiddishCity: "קערעסטיר",
    country: "Hungary",
    tzaddik: "Rabbi Yeshaya Steiner, Reb Shayale of Kerestir",
    yiddishTzaddik: "רבי ישעיה'לע קערעסטירער",
    aliases: ["Bodrogkeresztúr", "Kerestur", "Reb Shayale", "רבי ישעיה'לע", "קערעסתיר"],
    overview: "Reb Shayale of Kerestir is remembered for extraordinary hachnasas orchim, tzedakah, and warmth toward every Yid. His kever draws visitors throughout the year, particularly around his yahrzeit.",
    seforim: "תורות וסיפורים של רבי ישעיה׳לע קערעסטירער",
    yahrzeit: "ג׳ אייר",
    niftar: "תרפ״ה / 1925",
    graveAddress: "Zsidó temető és kilátó parkoló, Unnamed Road, 3916 Bodrogkeresztúr, Hungary",
    graveCoordinates: "48°09'56.2\"N 21°21'34.9\"E",
    findingNotes: [
      "Use the exact map pin for the Jewish cemetery parking area; rural roads and map labels can vary.",
      "After arriving, follow current local signs and directions for the cemetery entrance and the ohel.",
      "On 3 Iyar and other busy dates, plan extra time for parking, walking, and local access arrangements.",
    ],
    sourceUrl: "https://nertzaddik.com/tzadik-info/?id=2865",
  },
  {
    slug: "munkatch",
    city: "Munkatch (Mukachevo)",
    yiddishCity: "מונקאטש",
    country: "Ukraine",
    tzaddik: "Rabbi Chaim Elazar Shapira, the Minchas Elazar",
    yiddishTzaddik: "בעל המנחת אלעזר ממונקאטש",
    aliases: ["Mukachevo", "Munkacs", "Minchas Elazar", "מנחת אלעזר", "מונקאץ"],
    overview: "The Minchas Elazar was the Munkatcher Rebbe and a central Chassidic leader in prewar Hungary. His tziyun is in Mukachevo's old Jewish cemetery, alongside the ohel of the Munkatcher Rebbes.",
    seforim: "מנחת אלעזר · דרכי תשובה · שער יששכר",
    yahrzeit: "ב׳ סיון",
    niftar: "תרצ״ז / 1937",
    graveAddress: "Old Jewish Cemetery, Myru St 102, Mukachevo, Zakarpattia Oblast, Ukraine, 89611",
    graveCoordinates: "48.441167, 22.732556",
    findingNotes: [
      "Set GPS to the exact coordinates for the old Jewish cemetery; street labels in the area can vary between maps.",
      "The ohel of the Shapiro Rebbes is within the cemetery. Confirm the current entrance and access details locally before setting out.",
      "Allow extra time for the final approach and follow current local guidance rather than an older online route.",
          "Worth confirming before you set out: sources record that in the 1970s the Munkács Jewish cemetery, the Admorim's ohel included, was moved to a new cemetery at Kerepec next to the town. Ask locally which ground the ohel stands in now rather than assuming the address you were given last time still holds.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    alsoBuried: [
      // The ohel is three generations of Munkatcher Rebbes, father and
      // grandfather with him. Somebody coming for the Minchas Elazar is
      // standing at all three.
      {
        name: "Rabbi Tzvi Hirsh Shapira",
        yiddishName: "רבי צבי הירש שפירא",
        knownAs: "The Darkei Teshuva",
        seforim: "דרכי תשובה",
        note: "1840–1913. Munkatcher Rov and father of the Minchas Elazar. Darkei Teshuva on Yoreh Deah is one of the standard works on hilchos issur v'heter, and the Munkatcher yeshiva carried its name.",
      },
      {
        name: "Rabbi Shlomo Shapira",
        yiddishName: "רבי שלמה שפירא",
        knownAs: "The first Munkatcher Rebbe",
        note: "Grandfather of the Minchas Elazar and an einikel of the Bnei Yissaschar of Dynów. He began the Munkatcher line.",
      },
    ],
    sourceUrl: "https://collections.yadvashem.org/en/untold-stories/community/14622219-Munkacs",
  },
  {
    slug: "rymanow",
    city: "Rymanów",
    yiddishCity: "רימינוב",
    country: "Poland",
    tzaddik: "Rabbi Menachem Mendel of Rymanów",
    yiddishTzaddik: "רבי מנחם מענדל מרימינוב",
    aliases: ["Rimanov", "Riminov", "Rymanover Rebbe", "רימנוב", "רימינאוו"],
    overview: "Reb Mendele of Rymanów was a leading disciple of Reb Elimelech of Lizhensk and the founder of the Rymanów Chassidic court. His kever is a central stop in southern Poland.",
    seforim: "מנחם ציון · דברי מנחם",
    yahrzeit: "י״ט אייר",
    niftar: "תקע״ה / 1815",
    graveAddress: "Słowackiego Street, 38-480 Rymanów, Poland",
    findingNotes: [
      "The Jewish cemetery is at the end of Słowackiego Street; use the map link rather than only the city center.",
      "The tziyun is in the cemetery with other historic kevarim of Rymanów.",
      "For a yahrzeit visit or group, confirm current cemetery access before traveling.",
          "There are TWO ohels at the top of the cemetery hill, not one. Reb Mendele is in his own; Reb Hirshele Rymanover and his son Reb Yosef are in the second. Looking for Reb Hirshele inside Reb Mendele's ohel is the usual way people miss him.",
    ],
    alsoBuried: [
      {
        name: "Rabbi Tzvi Hirsh Kohen of Rymanów",
        yiddishName: "רבי צבי הירש מרימינוב",
        knownAs: "Reb Hirshele Rymanover",
        note: "Niftar 1847. Reb Mendele's attendant, and Rebbe in Rymanów from 1827 after him. He lies in the second ohel, not in Reb Mendele's.",
      },
      {
        name: "Rabbi Yosef Friedman",
        yiddishName: "רבי יוסף פרידמאן",
        note: "Niftar 1913. Son of Reb Hirshele, buried beside him in the same ohel.",
      },
    ],
    sourceUrl: "https://nertzaddik.com/tzadik-info?id=3188",
  },
  {
    slug: "dynow",
    city: "Dynów",
    yiddishCity: "דינוב",
    country: "Poland",
    tzaddik: "Rabbi Tzvi Elimelech Shapira, the Bnei Yissaschar",
    yiddishTzaddik: "בעל הבני יששכר מדינוב",
    aliases: ["Dinov", "Dinow", "Bnei Yissaschar", "בני יששכר", "דינאוו"],
    overview: "The Bnei Yissaschar was a major Chassidic Rebbe and prolific Torah author. He is buried in Dynów, a practical addition to a Galicia route.",
    seforim: "בני יששכר · אגרא דכלה · דרך פקודיך",
    yahrzeit: "י״ח טבת",
    niftar: "תרס״א / 1841",
    graveAddress: "Dynów Jewish Cemetery, Marszałka Piłsudskiego, 36-065 Dynów, Poland",
    graveCoordinates: "49°48'15\"N 22°14'12\"E",
    findingNotes: [
      "Navigate directly to Dynów Jewish Cemetery on Marszałka Piłsudskiego Street.",
      "Once at the cemetery, ask locally or follow the current cemetery markings for the Bnei Yissaschar's tziyun.",
      "Check current entrance arrangements before a special trip, since historic cemetery access can change.",
    ],
    sourceUrl: "https://nertzaddik.com/tzadik-info?id=3178",
  },
  {
    slug: "sanz",
    city: "Sanz (Nowy Sącz)",
    yiddishCity: "צאנז",
    country: "Poland",
    tzaddik: "Rabbi Chaim Halberstam, the Divrei Chaim of Sanz",
    yiddishTzaddik: "בעל הדברי חיים מצאנז",
    aliases: ["Nowy Sącz", "Nowy Sacz", "Tzanz", "Divrei Chaim", "דברי חיים", "סאנץ"],
    overview: "The Divrei Chaim of Sanz founded the Sanz Chassidic dynasty and is buried in the ohel of the Sanz Rebbes in Nowy Sącz's new Jewish cemetery.",
    seforim: "דברי חיים",
    yahrzeit: "כ״ה ניסן",
    niftar: "תרל״ו / 1876",
    graveAddress: "New Jewish Cemetery, Rybacka 4, 33-395 Nowy Sącz, Poland",
    graveCoordinates: "49.6325762, 20.6897879",
    findingNotes: [
      "Set navigation to Rybacka 4, the new Jewish cemetery; the Sanz Rebbes' ohel is on the cemetery grounds.",
      "The cemetery is about 650 metres north of the city square, between Rybacka and Flisaków Streets.",
      "Access to the ohel may require current local arrangements, so confirm before the trip or a large group visit.",
    ],
    accessContacts: [
      {
        label: "Cemetery shomer",
        phone: "+48-51-394-9894",
        note: "Please call ahead to confirm current access.",
      },
      {
        label: "Cemetery shomer",
        phone: "+48-18-441-9381",
        note: "Please call ahead to confirm current access.",
      },
    ],
    alsoBuried: [
      // The Sanzer ohel is a family, not one kever. Four generations of the
      // Halberstams lie in it, and a Sanzer chosid coming for the Divrei Chaim
      // is standing beside all of them.
      {
        name: "Rabbi Aron Halberstam",
        yiddishName: "רבי אהרן האלבערשטאם",
        knownAs: "The second Sanzer Rov",
        note: "Niftar 1903. Son of the Divrei Chaim, and Rov of Sanz after him.",
      },
      {
        name: "Rabbi Meir Nosson Halberstam",
        yiddishName: "רבי מאיר נתן האלבערשטאם",
        note: "Niftar 1855, in his father's lifetime. Son of the Divrei Chaim.",
      },
      {
        name: "Rabbi Sholom Halberstam",
        yiddishName: "רבי שלום האלבערשטאם",
        note: "Niftar 1931. Son of Reb Aron and an einikel of the Divrei Chaim.",
      },
    ],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/nowy-sacz-new-jewish-cemetery/",
  },
  {
    slug: "ijhel",
    city: "Sátoraljaújhely (Ijhel)",
    yiddishCity: "איהעל",
    country: "Hungary",
    tzaddik: "Rabbi Moshe Teitelbaum, the Yismach Moshe",
    yiddishTzaddik: "בעל הישמח משה מאיהעל",
    aliases: ["Ujhely", "Satoraljaujhely", "Yismach Moshe", "ישמח משה", "איהל"],
    overview: "The Yismach Moshe was a foundational leader of Hungarian Chassidus and the Rav of Ujhely. His ohel in the old Jewish cemetery is a central stop on the Hungary route.",
    seforim: "ישמח משה",
    yahrzeit: "כ״ח תמוז",
    niftar: "תר״א / 1841",
    graveAddress: "Old Jewish Cemetery, Sátoraljaújhely, Hungary",
    graveCoordinates: "48.388915, 21.655795",
    findingNotes: [
      "Navigate to the old Jewish cemetery, not one of the other cemeteries in the town.",
      "The ohel of the Yismach Moshe is on the cemetery grounds; follow the current signs and access instructions after arriving.",
      "Confirm gate access before traveling, especially for a group or a yahrzeit visit.",
          "The ohel holds three kevarim, not one: the Yismach Moshe, his rebbetzin, and Reb Alexander of Komárom. It is a building rather than a stone, so you daven inside it.",
    ],
    accessContacts: [
      {
        label: "מיקי · Cemetery shomer",
        phone: "+36-30-874-2293",
        note: "Publicly listed as a shomer for the old Jewish cemetery. Please call ahead to confirm current access.",
      },
      {
        label: "שמואל מרדכי · Cemetery shomer",
        phone: "+36-70-387-9737",
        note: "Publicly listed as an additional shomer for the old Jewish cemetery. Please call ahead to confirm current access.",
      },
    ],
    alsoBuried: [
      {
        name: "Rabbi Alexander of Komárom",
        yiddishName: "רבי אלכסנדר מקאמארן",
        note: "In the same ohel as the Yismach Moshe. The building holds three kevarim — the Yismach Moshe, his rebbetzin, and him.",
      },
    ],
    sourceUrl: "https://nertzaddik.com/tzadik-info/?id=2922",
  },
  {
    slug: "liska",
    city: "Olaszliszka (Liska)",
    yiddishCity: "ליסקא",
    country: "Hungary",
    tzaddik: "Rabbi Tzvi Hirsch Friedman, the Ach Pri Tevuah",
    yiddishTzaddik: "בעל האך פרי תבואה מליסקא",
    aliases: ["Liska", "Olaszliszka", "Reb Hershele Lisker", "אך פרי תבואה", "ליסקא"],
    overview: "Reb Hershele of Liska was a leading Hungarian Rebbe and the founder of the Liska dynasty. His kever is a major stop for visitors travelling through the Tokaj-Hegyalja region.",
    seforim: "אך פרי תבואה · הישר והטוב",
    yahrzeit: "י״ד אב",
    niftar: "תרל״ד / 1874",
    graveAddress: "Jewish Cemetery, Olaszliszka, Hungary",
    graveCoordinates: "48.250000, 21.433333",
    findingNotes: [
      "Set navigation to the Jewish cemetery in Olaszliszka; rural map labels can differ between providers.",
      "The kever of Reb Hershele is the principal pilgrimage site in the cemetery.",
      "Confirm current entry arrangements before setting out, particularly around י״ד אב.",
    ],
    sourceUrl: "https://encyclopedia.yivo.org/article.aspx/Friedman_Tsevi_Hirsh",
  },
];

export function getCityGuide(slug: string) {
  return cityGuides.find((guide) => guide.slug === slug);
}
