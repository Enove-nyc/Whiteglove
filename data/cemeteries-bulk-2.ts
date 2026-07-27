// Bulk kevarim — batch 2. Web-researched additions to the cemetery directory,
// each with a source. IMPORTANT: gathered from public sources — confirm before
// travelers rely on it. Coordinates are included ONLY where a reliable source
// gives the actual grave/ohel location; where it doesn't, coordinates are left
// out and the town + "confirm locally" is noted instead (never guessed).

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries2: Cemetery[] = [
  {
    slug: "vilnius-vilna-gaon",
    city: "Vilnius (Vilna)",
    yiddishCity: "ווילנא",
    name: "Vilnius Jewish Cemetery (Sudervės) — Ohel of the Vilna Gaon",
    yiddishName: "בית החיים ווילנא",
    country: "Lithuania",
    address: "Jewish cemetery, Sudervės g. 28, Vilnius, Lithuania",
    coordinates: "54.7129, 25.2345",
    arrivalNotes: [
      "The Vilna Gaon and his family rest in an ohel at the working Jewish cemetery on Sudervės road, on the northwest edge of Vilnius (the old Šnipiškės cemetery was razed under Soviet rule and the graves reinterred here).",
      "The Ger Tzedek (Avraham ben Avraham, Count Potocki) and the Chayei Adam are also memorialized in the ohel. Confirm the gate and access arrangements with the Lithuanian Jewish Community before traveling.",
    ],
    accessNote: "Active Jewish cemetery on the city's edge; the Gaon's ohel is the focus. Arrange access with the Lithuanian Jewish Community (Vilnius).",
    burials: [
      { name: "Rabbi Eliyahu ben Shlomo Zalman", yiddishName: "רבי אליהו בן שלמה זלמן", knownAs: "The Vilna Gaon · the Gra", seforim: "אדרת אליהו · ביאור הגר״א · שנות אליהו", yahrzeit: "י״ט תשרי · 5558 / 1797", note: "The Gaon of Vilna; reinterred in the ohel at the Sudervės cemetery after the old cemetery was destroyed." },
    ],
    sourceUrl: "https://www.jewish-heritage-lithuania.org/cemetery/the-mausoleum-of-vilna-gaon-and-his-family/",
  },
  {
    slug: "netivot-baba-sali",
    city: "Netivot",
    yiddishCity: "נתיבות",
    name: "Baba Sali Grave Estate, Netivot",
    yiddishName: "ציון הבבא סאלי",
    country: "Israel",
    address: "Baba Sali grave estate, edge of the Netivot municipal cemetery, Netivot, Israel",
    coordinates: "31.4303, 34.5853",
    arrivalNotes: [
      "A large fenced, stone-domed compound at the edge of the Netivot cemetery; a year-round pilgrimage site with separate men's and women's sections, busiest on the yahrzeit (4 Shevat).",
      "Managed by the Baba Sali Association (babasali.co.il). Open daily; confirm hours around Shabbat and the hilula.",
    ],
    accessNote: "State-recognized holy site with a managing association; open to visitors, men's and women's sections. Confirm hours before Shabbat and the hilula.",
    burials: [
      { name: "Rabbi Yisrael Abuchatzeira", yiddishName: "רבי ישראל אבוחצירא", knownAs: "The Baba Sali", yahrzeit: "ד׳ שבט · 5744 / 1984", note: "Renowned Moroccan-born kabbalist and tzaddik; his Netivot kever draws pilgrims from across Israel and abroad." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Baba_Sali",
  },
  {
    slug: "radun-chofetz-chaim",
    city: "Radun (Radin)",
    yiddishCity: "ראדין",
    name: "Radun Jewish Cemetery — Ohel of the Chofetz Chaim",
    yiddishName: "בית החיים ראדין",
    country: "Belarus",
    address: "Radun (Raduń), Voranava district, Hrodna (Grodno) region, Belarus (~25 km NW of Lida)",
    arrivalNotes: [
      "A wooden ohel stands over the grave of the Chofetz Chaim in the restored Radun Jewish cemetery, alongside matsevot of Radun yeshiva rabbis (including Rabbi Naftali Tropp). The town is home to the historic Radun Yeshiva.",
      "Exact grave GPS is not confirmed from a reliable public source here — confirm the cemetery/ohel location and access locally (the site was restored in the 1990s). Belarus entry rules change; check current travel requirements.",
    ],
    accessNote: "Restored memorial cemetery with a wooden ohel over the Chofetz Chaim's grave. Confirm exact location and access locally before traveling.",
    burials: [
      { name: "Rabbi Yisrael Meir Kagan", yiddishName: "רבי ישראל מאיר הכהן קגן", knownAs: "The Chofetz Chaim", seforim: "חפץ חיים · שמירת הלשון · משנה ברורה · אהבת חסד", yahrzeit: "כ״ד אלול · 5693 / 1933", note: "Author of the Mishnah Berurah; head of the Radun Yeshiva. Buried under an ohel in Radun." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yeshiva_Chofetz_Chaim_of_Radin",
  },
  {
    slug: "hadiach-baal-hatanya",
    city: "Hadiach (Haditch)",
    yiddishCity: "האַדיטש",
    name: "Hadiach — Ohel of the Baal HaTanya (Alter Rebbe)",
    yiddishName: "אוהל בעל התניא",
    country: "Ukraine",
    address: "Ohel of Rabbi Schneur Zalman, Hadiach (Gadyach), Poltava Oblast, Ukraine",
    arrivalNotes: [
      "The ohel of the Alter Rebbe, founder of Chabad, stands in Hadiach in east-central Ukraine; a Chabad pilgrimage site, busiest around the yahrzeit (24 Tevet). A 'kohanim bridge' lets kohanim visit without passing over other graves.",
      "Exact grave GPS is not confirmed from a reliable public source here — arrange the visit and current access through Chabad of Hadiach. Ukraine sites are wartime-sensitive; check travel advisories.",
    ],
    accessNote: "Chabad-maintained ohel with a kohanim bridge. Confirm exact location, current access and safety through Chabad of Hadiach, especially given the war.",
    burials: [
      { name: "Rabbi Schneur Zalman of Liadi", yiddishName: "רבי שניאור זלמן מליאדי", knownAs: "The Alter Rebbe · the Baal HaTanya", seforim: "תניא (ליקוטי אמרים) · שולחן ערוך הרב", yahrzeit: "כ״ד טבת · 5573 / 1812", note: "Founder and first Rebbe of Chabad; passed away while fleeing Napoleon's advance and buried in Hadiach." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi",
  },
];
