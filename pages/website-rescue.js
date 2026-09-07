import WebsiteRescueConversionPage from '../components/WebsiteRescueConversionPage.js';
import { getRapidDeliveryOffer } from '../lib/public/rapid-delivery-offers.js';

const offer = getRapidDeliveryOffer('premium-landing-page-rescue');
if (!offer) {
  throw new Error('Website Rescue SKU missing: premium-landing-page-rescue');
}

/**
 * Buyer-named Website Rescue landing (#710 / #700).
 * Reuses the existing Premium Landing Page Rescue SKU — no second product,
 * no second database, no `/offers/website-rescue` page.
 */
export default function WebsiteRescuePage() {
  return (
    <div data-website-rescue-landing="1">
      <WebsiteRescueConversionPage offer={offer} />
    </div>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
