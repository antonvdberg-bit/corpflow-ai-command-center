import RapidDeliveryOfferPage from '../../components/RapidDeliveryOfferPage.js';
import { getRapidDeliveryOffer } from '../../lib/public/rapid-delivery-offers.js';

const offer = getRapidDeliveryOffer('ai-lead-rescue');

export default function AiLeadRescueOfferPage() {
  return <RapidDeliveryOfferPage offer={offer} />;
}

export async function getStaticProps() {
  return { props: {} };
}
