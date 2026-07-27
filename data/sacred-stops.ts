import { placeMapUrl } from "@/data/route-utils";

export type SacredStop = {
  city: string;
  traditionalName?: string;
  yiddishName: string;
  aliases?: string[];
  country: string;
  address: string;
  coordinates: string;
  note?: string;
};

export const sacredStops: SacredStop[] = [
  { city: "Tarcal", yiddishName: "טארקאל", country: "Hungary", address: "Beis Hachayim Tarcal, Keresztúri u. 25, 3915 Tarcal", coordinates: "48°08'06.9\"N 21°20'45.6\"E" },
  { city: "Dolyna", yiddishName: "דאלינא", country: "Ukraine", address: "Vulytsya Volodymyra Vynnychenka 39, Dolyna, Ivano-Frankivs'ka Oblast, 77500", coordinates: "48°57'42.8\"N 23°59'41.6\"E" },
  { city: "Albertirsa", yiddishName: "אלבערטירשא", country: "Hungary", address: "Jewish Cemetery Irsa, Akácfa u. 3–5, 2730 Albertirsa", coordinates: "47°14'59.1\"N 19°36'03.5\"E" },
  { city: "Leżajsk", traditionalName: "Lizhensk", yiddishName: "ליזענסק", aliases: ["Lizensk", "ליז'ענסק"], country: "Poland", address: "Lizhensk Jewish Cemetery, Górna 16, 37-300 Leżajsk", coordinates: "50°15'04.7\"N 22°25'18.7\"E", note: "Kever of Reb Elimelech of Lizhensk." },
  { city: "Bodrogkeresztúr", traditionalName: "Kerestir", yiddishName: "קערעסטיר", aliases: ["Kerestir", "קערעסתיר"], country: "Hungary", address: "Zsidó temető és kilátó parkoló, Unnamed Road, 3916 Bodrogkeresztúr", coordinates: "48°09'56.2\"N 21°21'34.9\"E" },
  { city: "Bardejov", yiddishName: "בארדיאוו", country: "Slovakia", address: "Židovský cintorín, 085 01 Bardejov", coordinates: "49°18'14.6\"N 21°17'01.3\"E" },
  { city: "Michalovce", traditionalName: "Mehalevetz", yiddishName: "מיכאלאָוויץ", aliases: ["Mihalovitz", "מיהאלאוויץ"], country: "Slovakia", address: "Cemetery, P. O. Hviezdoslava, 071 01 Michalovce", coordinates: "48°46'01.2\"N 21°54'06.1\"E" },
  { city: "Uzhhorod", traditionalName: "Ungvar", yiddishName: "אונגוואר", country: "Ukraine", address: "Kotlyarevs'koho St 5–7, Uzhhorod, Zakarpattia Oblast, 88000", coordinates: "48°38'07.0\"N 22°18'43.3\"E" },
  { city: "Bratislava", traditionalName: "Preshburg", yiddishName: "פרעשבורג", country: "Slovakia", address: "Nábrežie armádneho generála Ludvíka Svobodu 22, 811 02 Bratislava", coordinates: "48°08'30.8\"N 17°05'29.7\"E" },
  { city: "Kraków", traditionalName: "Krokow", yiddishName: "קראקא", country: "Poland", address: "Szeroka 39, 31-053 Kraków", coordinates: "50°03'08.7\"N 19°56'50.8\"E", note: "First Kraków location." },
  { city: "Kraków", traditionalName: "Krokow", yiddishName: "קראקא", country: "Poland", address: "Miodowa 55, 31-036 Kraków", coordinates: "50°03'14.9\"N 19°57'00.1\"E", note: "Second Kraków location." },
  { city: "Maidan", yiddishName: "מיידאן", country: "Ukraine", address: "Maidan Guest House, Verkhovynska 56, Maidan, Zakarpattia Oblast, 90024", coordinates: "48°36'19.6\"N 23°28'53.3\"E" },
  { city: "Kisvárda", traditionalName: "Kleinvardein", yiddishName: "קליינווארדיין", country: "Hungary", address: "Kisvárda Jewish Cemetery", coordinates: "Location pin to be added", note: "Exact street address and coordinates pending." },
  { city: "Lviv", traditionalName: "Lemberg", yiddishName: "לעמבערג", country: "Ukraine", address: "Old Beis Hachayim, Lviv, Lviv Oblast, 79000", coordinates: "49.84488, 24.01679" },
  { city: "Mukachevo", traditionalName: "Minkatch", yiddishName: "מונקאטש", aliases: ["Munkacs", "מינקאטש"], country: "Ukraine", address: "Myru St 102, Mukacheve, Zakarpattia Oblast, 89611", coordinates: "48°26'28.2\"N 22°43'57.2\"E" },
];

export function mapsUrl(stop: SacredStop) {
  return placeMapUrl(stop.address, stop.coordinates);
}
