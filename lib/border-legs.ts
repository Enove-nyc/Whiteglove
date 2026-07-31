import type { BorderCostFn, BorderEnd } from "@/data/itinerary";
import { type Crossing } from "@/lib/border-crossings";
import { borderCost } from "@/lib/border-time";
import { borderBetween, countryOf } from "@/lib/borders";

/**
 * The bridge between the planner's arithmetic and what is known about borders.
 *
 * data/itinerary.ts holds no knowledge of which countries border which, and
 * should not start — it is the day-by-day arithmetic and nothing else. So it
 * asks a function for the cost of a leg, and this builds that function out of
 * the crossings the server has read.
 *
 * The answer is worked out once per country pair and remembered, because a
 * fortnight's itinerary asks the same Poland-to-Ukraine question on every day
 * it happens and the ranking behind it is not free.
 */
export function borderCostForLegs(crossings: Crossing[], today: string): BorderCostFn {
  const seen = new Map<string, { minutes: number; says: string }>();

  return (from: BorderEnd, to: BorderEnd) => {
    const fromCountry = countryOf({ address: from.address ?? "", country: from.country });
    const toCountry = countryOf({ address: to.address ?? "", country: to.country });
    const crossing = borderBetween(fromCountry, toCountry);
    if (!crossing || !fromCountry || !toCountry) return { minutes: 0, says: "" };

    const key = `${fromCountry}>${toCountry}`;
    const remembered = seen.get(key);
    if (remembered) return remembered;

    const cost = borderCost({ from: fromCountry, to: toCountry, major: crossing.major, crossings, today });
    const answer = { minutes: cost.minutes, says: cost.says };
    seen.set(key, answer);
    return answer;
  };
}
