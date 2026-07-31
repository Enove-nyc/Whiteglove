/**
 * What an advertisement is actually doing, and whether it is even running.
 *
 * The manager listed every advert with "12 seen · 3 clicked" and its dates as
 * plain text. Two things were missing from that, and both are the difference
 * between a list and a manager.
 *
 * FIRST: whether it is running at all. An advert whose end date passed in March
 * still says "enabled" and still sits at the top of the list looking live. The
 * owner has no way to tell it apart from one that is on the site right now
 * except by reading eleven dates and comparing each to today.
 *
 * SECOND: a rate you can act on. Three clicks from twelve views is 25%, which
 * sounds excellent and means nothing — with twelve views the true rate could be
 * almost anything. Printing a percentage there invites a decision the number
 * cannot support. Below a threshold this says so instead.
 *
 * Nothing here reads a database or the clock; `today` is passed in.
 */

export type AdLike = {
  id: string;
  title: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  placements: string[];
  impressions: number;
  clicks: number;
  advertiserName?: string;
};

export type AdState = "live" | "scheduled" | "finished" | "paused" | "nowhere";

const STATE_WORDS: Record<AdState, string> = {
  live: "On the site now",
  scheduled: "Starts later",
  finished: "Finished",
  paused: "Paused",
  nowhere: "Not placed anywhere",
};

export function stateWord(state: AdState): string {
  return STATE_WORDS[state];
}

/**
 * Where this advert stands today.
 *
 * Order matters. Paused is checked first because it is a decision somebody
 * made and it beats the dates. "Nowhere" comes before the dates too: an advert
 * with no placement cannot appear whatever its dates say, and calling it live
 * would be a lie the owner acts on.
 */
export function adState(ad: AdLike, today: string): AdState {
  if (!ad.enabled) return "paused";
  if (!ad.placements.length) return "nowhere";
  if (ad.startDate.trim() && ad.startDate > today) return "scheduled";
  if (ad.endDate.trim() && ad.endDate < today) return "finished";
  return "live";
}

/**
 * Views before a click rate means anything.
 *
 * A hundred is not a statistical claim, it is a floor below which the number
 * moves too much to act on: at ten views one extra click swings the rate by
 * ten points. The point is to stop the screen printing a confident-looking
 * figure that the data cannot support.
 */
export const ENOUGH_VIEWS = 100;

export type AdPerformance = {
  /** Clicks per hundred views, or null when there are too few to say. */
  rate: number | null;
  /** What to print. Never a percentage the numbers cannot support. */
  says: string;
};

export function performance(ad: AdLike): AdPerformance {
  if (ad.impressions <= 0) return { rate: null, says: "Not shown yet" };
  if (ad.impressions < ENOUGH_VIEWS) {
    return { rate: null, says: `${ad.clicks} from ${ad.impressions} — too few to tell yet` };
  }
  const rate = (ad.clicks / ad.impressions) * 100;
  return { rate, says: `${rate.toFixed(1)}% of ${ad.impressions.toLocaleString()} views` };
}

export type AdConcern = { weight: 1 | 2 | 3; says: string };

/**
 * What is wrong with this advert, if anything.
 *
 * Only things the owner would want to do something about. "No clicks yet" on
 * an advert seen forty times is not a finding; on one seen five thousand times
 * it is the whole story.
 */
export function adConcerns(ad: AdLike, today: string): AdConcern[] {
  const concerns: AdConcern[] = [];
  const state = adState(ad, today);

  if (state === "nowhere") {
    concerns.push({ weight: 1, says: "Switched on, but not placed anywhere — nobody can see it." });
  }

  if (state === "finished") {
    // Enabled AND finished: it reads as live in every list and is not.
    concerns.push({ weight: 2, says: `Ran until ${ad.endDate} and is still switched on.` });
  }

  if (state === "live" && ad.endDate.trim()) {
    const days = daysBetween(today, ad.endDate);
    if (days !== null && days <= 7) {
      concerns.push({
        weight: 2,
        says: days <= 0 ? "Ends today." : `Ends in ${days} ${days === 1 ? "day" : "days"}.`,
      });
    }
  }

  if (state === "live" && ad.impressions === 0) {
    concerns.push({ weight: 3, says: "Live, but has not been shown to anybody yet." });
  }

  if (ad.impressions >= ENOUGH_VIEWS && ad.clicks === 0) {
    concerns.push({ weight: 3, says: `Seen ${ad.impressions.toLocaleString()} times and never clicked.` });
  }

  return concerns.sort((a, b) => a.weight - b.weight);
}

/** Whole days from `from` to `to`, or null when either is unreadable. */
function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export type ManagedAd = {
  ad: AdLike;
  state: AdState;
  performance: AdPerformance;
  concerns: AdConcern[];
};

/**
 * Every advert, the ones wanting attention first.
 *
 * Then the live ones, then everything finished or paused — which is the order
 * somebody opening this screen wants: what is wrong, what is running, what is
 * history.
 */
export function manageAds(ads: AdLike[], today: string): ManagedAd[] {
  const managed = ads.map((ad) => ({
    ad,
    state: adState(ad, today),
    performance: performance(ad),
    concerns: adConcerns(ad, today),
  }));

  const rank = (item: ManagedAd) => {
    const worst = item.concerns[0]?.weight;
    if (worst === 1) return 0;
    if (worst === 2) return 1;
    if (item.state === "live") return 2;
    if (item.state === "scheduled") return 3;
    if (worst === 3) return 4;
    return 5;
  };

  return managed.sort((a, b) => rank(a) - rank(b) || a.ad.title.localeCompare(b.ad.title));
}

/** The one-line summary for the dashboard. Null when nothing needs doing. */
export function adsNeedingAttention(ads: AdLike[], today: string): { count: number; says: string } | null {
  const managed = manageAds(ads, today).filter((item) => item.concerns.some((c) => c.weight <= 2));
  if (!managed.length) return null;
  const first = managed[0];
  return {
    count: managed.length,
    says:
      managed.length === 1
        ? `“${first.ad.title}” — ${first.concerns[0].says.toLowerCase()}`
        : `${managed.length} advertisements need a look, starting with “${first.ad.title}”.`,
  };
}
