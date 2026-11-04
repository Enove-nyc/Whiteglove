/** Small display props; the full license register stays on the server. */
export type PlacePhoto = {
  src: string;
  alt: string;
  creditId: string;
  width: number;
  height: number;
  /** A city context photo is labelled, rather than presented as the attraction itself. */
  context?: string;
};

export type DiscoveryPhotoCredit = {
  id: string; title: string; author: string; license: string; licenseUrl: string;
  sourcePage: string; originalUrl: string; sha1: string; checkedAt: string; changes: string;
};

export type DiscoveryPhotoIndex = {
  attraction: Record<string, PlacePhoto & { article: string; bytes?: number }>;
  city: Record<string, PlacePhoto & { article: string; bytes?: number }>;
  vacation: Record<string, PlacePhoto & { article: string; bytes?: number }>;
  credits: Record<string, DiscoveryPhotoCredit>;
};
