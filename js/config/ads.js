// Vertical 9:16 reels used by every ad pop-up.
// Every .mp4 inside AD_FOLDER is discovered automatically at startup (works with `npx serve`
// and Live Server, which both list folders). AD_REELS is the fallback list if discovery fails.
// If nothing loads, a fallback static parody ad is shown instead.
export const AD_FOLDER = 'resources/ads videos/';

export const AD_REELS = [
  'resources/ads videos/code flow duck.mp4',
  'resources/ads videos/add one.mp4',
];

// The main sponsor. Its ads get the "MAIN SPONSOR" label, and it's always the first ad you see.
export const MAIN_AD = 'resources/ads videos/code flow duck.mp4';
export const MAIN_AD_LABEL = 'MAIN SPONSOR · CODE FLOW';
