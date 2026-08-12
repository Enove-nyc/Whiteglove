import Script from "next/script";

/**
 * Travelpayouts (Emerald) site-verification snippet.
 *
 * The affiliate dashboard requires this script on public pages so it can
 * confirm the domain. Loaded once from the root layout via next/script;
 * WordPress cache-bypass attributes are not used here.
 */
export default function TravelpayoutsScript() {
  return (
    <Script
      src="https://emrldco.com/NTU5Nzcx.js?t=559771"
      strategy="afterInteractive"
      data-cmp-ab="2"
    />
  );
}
