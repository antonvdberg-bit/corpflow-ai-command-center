/**
 * Client-owned visual paths for Café International Website Rescue preview.
 * Source: Anton Drive folder + official cafeinternational.net / Restaurant Guru assets.
 * Optimised copies live under /assets/cafe-international/client/.
 */

export const CAFE_INTERNATIONAL_ASSET_BASE = '/assets/cafe-international/client';

export const CAFE_INTERNATIONAL_OWNERS = 'Deon and Annemarie';

export const CAFE_INTERNATIONAL_RESTAURANT_GURU_URL =
  'https://restaurantguru.com/Cafe-International-The-Flame-Grill-Cafe-Trou-aux-Biches';

/**
 * Verified public Restaurant Guru listing facts (#885).
 * Snapshot from the live listing page (2026-08-12). Vote totals can move;
 * copy must stay attributable to the public listing, not invented reviews.
 */
export const CAFE_INTERNATIONAL_RESTAURANT_GURU_PROOF = Object.freeze({
  listingUrl: CAFE_INTERNATIONAL_RESTAURANT_GURU_URL,
  votes: 971,
  verifiedAt: '2026-08-12',
  rankLine: '#1 of 30 BBQs in Trou-aux-Biches',
  aggregateSources: Object.freeze(['Google', 'Trip', 'Facebook', 'Foursquare']),
  googleScoreNote: '4.5 Google score shown on the Restaurant Guru listing',
  /**
   * Official Best Steaks 2025 circle-ribbon award widget already published on
   * cafeinternational.net (GoHighLevel custom code). Public CDN CSS + static
   * SVG/HTML — no paid dependency, no Awards Center account step required to
   * reuse this existing surface.
   */
  officialAwardCssHref: 'https://awards.infcdn.net/2024/circle_v2.css',
  officialAwardWidgetHtml: [
    '<div id="circle-r-ribbon" data-cafe-rg-official-ribbon',
    ' onclick="if(event.target.nodeName.toLowerCase() != \'a\') {',
    "window.open(this.querySelector('.r-ribbon_title').href);return 0;}\" class=\"\">",
    '<div class="r-ribbon_ahead ">',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
    ' width="160px" height="160px" viewBox="0 0 160 160">',
    '<defs><path id="heading-arc" d="M 30 80 a 50 50 0 1 1 100 0"></path></defs>',
    '<text class="r-ribbon_ahead-heading " fill="#000" text-anchor="middle">',
    '<textPath startOffset="50%" xlink:href="#heading-arc">Best steaks</textPath>',
    '</text></svg></div>',
    '<p class="r-ribbon_year">2025</p>',
    `<a href="${CAFE_INTERNATIONAL_RESTAURANT_GURU_URL}" class="r-ribbon_title f8"`,
    ' target="_blank" rel="noopener noreferrer">',
    'Café International &quot;The Flame Grill Café&quot;</a>',
    '<div class="r-ribbon_ahead r-ribbon_ahead-bottom">',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
    ' width="120px" height="120px" viewBox="0 0 120 120">',
    '<defs><path id="subheading-arc" d="M 12 60 a 48 48 0 0 0 96 0"></path></defs>',
    '<text class="r-ribbon_ahead-subh" fill="#000" text-anchor="middle">',
    '<textPath startOffset="50%" xlink:href="#subheading-arc">',
    '<a href="https://restaurantguru.com" target="_blank" rel="noopener noreferrer">',
    'Restaurant Guru</a></textPath></text></svg></div></div>',
  ].join(''),
});

export const CAFE_INTERNATIONAL_VISUALS = Object.freeze({
  heroGrill: `${CAFE_INTERNATIONAL_ASSET_BASE}/hero-grill.jpg`,
  plateSteak: `${CAFE_INTERNATIONAL_ASSET_BASE}/plate-steak.jpg`,
  plateBurger: `${CAFE_INTERNATIONAL_ASSET_BASE}/plate-burger.jpg`,
  plateBurgerCheese: `${CAFE_INTERNATIONAL_ASSET_BASE}/plate-burger-cheese.jpg`,
  plateChicken: `${CAFE_INTERNATIONAL_ASSET_BASE}/plate-chicken.jpg`,
  platePlatter: `${CAFE_INTERNATIONAL_ASSET_BASE}/plate-platter.jpg`,
  venuePatio: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-patio.jpg`,
  venueInterior: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-interior.jpg`,
  venueEvening: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-evening.jpg`,
  venueBuzz: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-buzz.jpg`,
  venueSteakhouse: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-steakhouse.jpg`,
  takeawayVisual: `${CAFE_INTERNATIONAL_ASSET_BASE}/takeaway-visual.jpg`,
  promoBurgers: `${CAFE_INTERNATIONAL_ASSET_BASE}/promo-burgers.jpg`,
  /** Official Flame Grill mark (client brand asset). */
  brandLogoMark: `${CAFE_INTERNATIONAL_ASSET_BASE}/brand-logo-mark.png`,
  /** Official Café International / The Flame Grill wide logo (live site source). */
  brandLogoWide: `${CAFE_INTERNATIONAL_ASSET_BASE}/brand-logo-wide.png`,
  /** Restaurant Guru Best Steaks 2025 badge (official awards widget artwork). */
  bestSteaks2025Badge: `${CAFE_INTERNATIONAL_ASSET_BASE}/best-steaks-2025-badge.png`,
  /**
   * Client food-motion clip — derived from Drive `Cafe International Real food.mp4`
   * (folder 1Ws9ylnyusEz8LOfaUFz5ug6L1TPKsOUW). Web encode: muted-ready H.264, ~12s.
   * Named candidates Upgrade/Perfection/Platter Party were not present in the folder at capture.
   * Audio (#871): ffprobe reports video-only (no audio track) — keep muted autoplay; no unmute control.
   */
  foodMotion: `${CAFE_INTERNATIONAL_ASSET_BASE}/food-motion.mp4`,
  foodMotionPoster: `${CAFE_INTERNATIONAL_ASSET_BASE}/food-motion-poster.jpg`,
  /**
   * Short venue atmosphere clip — Drive `Cafe Int People Buzz.mp4`.
   * Audio (#871): ffprobe reports video-only (no audio track) — keep muted autoplay; no unmute control.
   */
  venueBuzzMotion: `${CAFE_INTERNATIONAL_ASSET_BASE}/venue-buzz-motion.mp4`,
});

export const CAFE_INTERNATIONAL_FOOD_MOTION_PROVENANCE = Object.freeze({
  drive_folder: 'https://drive.google.com/drive/folders/1Ws9ylnyusEz8LOfaUFz5ug6L1TPKsOUW',
  source_filename: 'Cafe International Real food.mp4',
  drive_file_id: '1aMb5AW4BQGT4Y2xRG19OYn7L-v92faGO',
  web_asset: 'public/assets/cafe-international/client/food-motion.mp4',
  poster_asset: 'public/assets/cafe-international/client/food-motion-poster.jpg',
  note:
    'Named #855 candidates (Upgrade 1 jun 26.mp4, Perfection Jun 26.mp4, Platter Party.mp4) were not in the Drive folder at capture; Real food.mp4 is authentic Café client footage used instead.',
});

export const CAFE_INTERNATIONAL_APPETITE_TILES = Object.freeze([
  {
    id: 'steaks',
    label: 'Steaks',
    href: '/demo/cafe-international/steaks-and-grill',
    image: CAFE_INTERNATIONAL_VISUALS.plateSteak,
    alt: 'Flame-grilled steak, medium-rare cut',
  },
  {
    id: 'burgers',
    label: 'Burgers',
    href: '/demo/cafe-international/menu#build-a-burger',
    image: CAFE_INTERNATIONAL_VISUALS.plateBurger,
    alt: 'Signature burger with chips at Café International',
  },
  {
    id: 'grill',
    label: 'From the grill',
    href: '/demo/cafe-international/steaks-and-grill',
    image: CAFE_INTERNATIONAL_VISUALS.plateChicken,
    alt: 'Grilled chicken from the flame grill',
  },
  {
    id: 'platters',
    label: 'Platters',
    href: '/demo/cafe-international/menu#platters',
    image: CAFE_INTERNATIONAL_VISUALS.platePlatter,
    alt: 'Cold platter prepared at Café International',
  },
]);
