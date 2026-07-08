import RapidDeliveryOfferPage from '../../components/RapidDeliveryOfferPage.js';
import { getRapidDeliveryOffer } from '../../lib/public/rapid-delivery-offers.js';

const offer = getRapidDeliveryOffer('premium-landing-page-rescue');

export default function PremiumLandingPageRescueOfferPage() {
  return <RapidDeliveryOfferPage offer={offer} />;
}

export async function getStaticProps() {
  return { props: {} };
}
