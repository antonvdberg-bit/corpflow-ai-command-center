/**
 * Client-owned visual paths for Café International Website Rescue preview.
 * Source: Anton Drive folder + official cafeinternational.net / Restaurant Guru assets.
 * Optimised copies live under /assets/cafe-international/client/.
 */

export const CAFE_INTERNATIONAL_ASSET_BASE = '/assets/cafe-international/client';

export const CAFE_INTERNATIONAL_OWNERS = 'Deon and Annemarie';

export const CAFE_INTERNATIONAL_RESTAURANT_GURU_URL =
  'https://restaurantguru.com/Cafe-International-The-Flame-Grill-Cafe-Trou-aux-Biches';

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
   */
  foodMotion: `${CAFE_INTERNATIONAL_ASSET_BASE}/food-motion.mp4`,
  foodMotionPoster: `${CAFE_INTERNATIONAL_ASSET_BASE}/food-motion-poster.jpg`,
  /** Short venue atmosphere clip — Drive `Cafe Int People Buzz.mp4`. */
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
