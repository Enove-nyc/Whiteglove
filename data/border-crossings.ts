/**
 * The road crossings on the borders these trips actually cross.
 *
 * WHAT IS IN HERE AND WHAT DELIBERATELY IS NOT.
 *
 * In: the facts that do not move — the crossing exists, which two towns it
 * joins, which road it is on, and whether it takes coaches or people on foot.
 * Those are true this year and were true last year.
 *
 * Out: how long the queue is, and whether it is open this morning. Both change
 * by the day, and a number written into the code is a number nobody can correct
 * when it stops being true. Worse, it would be believed: somebody plans a
 * five-hour drive around "usually 90 minutes" and finds out at the barrier.
 *
 * So every crossing here arrives UNCHECKED. What it is like today is something
 * a person has to look at and record in the admin, and until they have, the
 * site says nobody has checked it rather than guessing. That is the same rule
 * the batei hachaim and the hechsherim follow, for the same reason.
 */

export type BuiltInCrossing = {
  /** Stable id — country pair and the two towns. Never regenerated. */
  id: string;
  /** The two countries, either order; matching ignores which way round. */
  countries: [string, string];
  /** What it is called, the way a driver would say it. */
  name: string;
  /** The town on each side, in the same order as `countries`. */
  towns: [string, string];
  /** The road, where there is a number worth having. */
  road?: string;
  /** Coaches and minibuses, which is how most groups on this site travel. */
  coaches?: boolean;
  /** People on foot — worth knowing when a coach queue is hours long. */
  pedestrians?: boolean;
  /** Anything permanent worth saying. Never a queue length. */
  note?: string;
};

export const BUILT_IN_CROSSINGS: BuiltInCrossing[] = [
  // ---- Poland ↔ Ukraine ------------------------------------------------
  // The most travelled leg on this site: Leżajsk, Lizhensk and Bobov on one
  // side, Uman, Berditchev and Medzhibozh on the other.
  {
    id: "pl-ua-korczowa-krakovets",
    countries: ["Poland", "Ukraine"],
    name: "Korczowa – Krakovets",
    towns: ["Korczowa", "Krakovets"],
    road: "A4 / M10",
    coaches: true,
    note: "On the motorway from Kraków and Rzeszów, and the usual way through for a coach heading to Lviv or Uman.",
  },
  {
    id: "pl-ua-medyka-shehyni",
    countries: ["Poland", "Ukraine"],
    name: "Medyka – Shehyni",
    towns: ["Medyka", "Shehyni"],
    road: "DK28 / M11",
    coaches: true,
    pedestrians: true,
    note: "Just east of Przemyśl. One of the few on this border that takes people on foot.",
  },
  {
    id: "pl-ua-hrebenne-rava-ruska",
    countries: ["Poland", "Ukraine"],
    name: "Hrebenne – Rava-Ruska",
    towns: ["Hrebenne", "Rava-Ruska"],
    road: "DK17 / M09",
    coaches: true,
    note: "The Lublin side, and the shorter way in from Warsaw.",
  },
  {
    id: "pl-ua-dorohusk-yahodyn",
    countries: ["Poland", "Ukraine"],
    name: "Dorohusk – Yahodyn",
    towns: ["Dorohusk", "Yahodyn"],
    road: "DK12 / M07",
    coaches: true,
    note: "The northern crossing, on the road from Lublin towards Kovel and Kyiv.",
  },
  {
    id: "pl-ua-zosin-ustyluh",
    countries: ["Poland", "Ukraine"],
    name: "Zosin – Ustyluh",
    towns: ["Zosin", "Ustyluh"],
    note: "Small, and worth asking about before relying on it with a coach.",
  },
  {
    id: "pl-ua-budomierz-hruszew",
    countries: ["Poland", "Ukraine"],
    name: "Budomierz – Hruszew",
    towns: ["Budomierz", "Hruszew"],
    note: "A quieter alternative to Korczowa when that one is backed up.",
  },
  {
    id: "pl-ua-krościenko-smilnytsia",
    countries: ["Poland", "Ukraine"],
    name: "Krościenko – Smilnytsia",
    towns: ["Krościenko", "Smilnytsia"],
    note: "In the Bieszczady, well south of the main roads.",
  },

  // ---- Hungary ↔ Ukraine -----------------------------------------------
  // The way in from Budapest, and the way to the Zakarpattia kevarim.
  {
    id: "hu-ua-zahony-chop",
    countries: ["Hungary", "Ukraine"],
    name: "Záhony – Chop",
    towns: ["Záhony", "Chop"],
    road: "M3 / M06",
    coaches: true,
    note: "The main road and rail crossing from Budapest into Zakarpattia.",
  },
  {
    id: "hu-ua-beregsurany-luzhanka",
    countries: ["Hungary", "Ukraine"],
    name: "Beregsurány – Luzhanka",
    towns: ["Beregsurány", "Luzhanka"],
    coaches: true,
    note: "The closer one for Mukachevo and Berehove.",
  },
  {
    id: "hu-ua-tiszabecs-vylok",
    countries: ["Hungary", "Ukraine"],
    name: "Tiszabecs – Vylok",
    towns: ["Tiszabecs", "Vylok"],
  },
  {
    id: "hu-ua-lonya-dzvinkove",
    countries: ["Hungary", "Ukraine"],
    name: "Lónya – Dzvinkove",
    towns: ["Lónya", "Dzvinkove"],
    note: "Small, and not always open to every kind of vehicle.",
  },

  // ---- Slovakia ↔ Ukraine ----------------------------------------------
  {
    id: "sk-ua-vysne-nemecke-uzhhorod",
    countries: ["Slovakia", "Ukraine"],
    name: "Vyšné Nemecké – Uzhhorod",
    towns: ["Vyšné Nemecké", "Uzhhorod"],
    road: "D1 / M06",
    coaches: true,
    note: "Slovakia's only road crossing into Ukraine.",
  },

  // ---- Romania ↔ Ukraine -----------------------------------------------
  {
    id: "ro-ua-siret-porubne",
    countries: ["Romania", "Ukraine"],
    name: "Siret – Porubne",
    towns: ["Siret", "Porubne"],
    road: "DN2 / M19",
    coaches: true,
    note: "The road to Chernivtsi, and the usual way up from Suceava.",
  },
  {
    id: "ro-ua-halmeu-diakove",
    countries: ["Romania", "Ukraine"],
    name: "Halmeu – Diakove",
    towns: ["Halmeu", "Diakove"],
    note: "The western one, towards Zakarpattia.",
  },

  // ---- Moldova ↔ Ukraine -----------------------------------------------
  {
    id: "md-ua-otaci-mohyliv-podilskyi",
    countries: ["Moldova", "Ukraine"],
    name: "Otaci – Mohyliv-Podilskyi",
    towns: ["Otaci", "Mohyliv-Podilskyi"],
    note: "On the Dniester, and the near one for the Podolia kevarim.",
  },

  // ---- Poland ↔ Belarus ------------------------------------------------
  // Kept because the road exists and somebody will ask. What it is doing
  // this month is exactly the sort of thing that has to be checked rather
  // than written down here.
  {
    id: "pl-by-terespol-brest",
    countries: ["Poland", "Belarus"],
    name: "Terespol – Brest",
    towns: ["Terespol", "Brest"],
    road: "DK2 / M1",
    note: "Check what is open on this border before planning anything through it.",
  },
];
