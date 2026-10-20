/**
 * Curated Google reviews for the phone hero (Jim, 2026-10-16): a handful of
 * REAL reviews, picked for upgrades and value, each linking to the review on
 * Google so a visitor can see it's genuine. Never a placeholder or a made-up
 * quote: the hero shows no review strip at all while this list is empty.
 *
 * To add one: open the review in Google Maps, use its Share link as `url`,
 * and copy the text exactly (trimming with "…" is fine; rewording is not).
 */
export interface HeroReview {
  /** The reviewer's words, verbatim (may be trimmed with "…"). */
  quote: string;
  /** The star rating the reviewer gave on Google (1–5). */
  rating: number;
  /** As shown on Google, e.g. "Sarah K." */
  author: string;
  /** Link to this review on Google. */
  url: string;
}

export const HERO_REVIEWS: HeroReview[] = [];
