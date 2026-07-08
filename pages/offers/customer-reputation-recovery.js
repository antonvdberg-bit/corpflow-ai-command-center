import RapidDeliveryOfferPage from '../../components/RapidDeliveryOfferPage.js';
import { getRapidDeliveryOffer } from '../../lib/public/rapid-delivery-offers.js';

const offer = getRapidDeliveryOffer('customer-reputation-recovery');

export default function CustomerReputationRecoveryOfferPage() {
  return <RapidDeliveryOfferPage offer={offer} />;
}

export async function getStaticProps() {
  return { props: {} };
}
