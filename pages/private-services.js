import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import { luxOnlyPageProps } from '../lib/client/lux-host-page-props.js';

/**
 * `/private-services` — Rare & Exclusive Collection (Lux host only).
 * Distinct from apex CorpFlow `/services`.
 */
export default function PrivateServicesPage({ seoHost = '' }) {
  return <RareExclusiveContentPage pageId="services" seoHost={seoHost} />;
}

export async function getServerSideProps({ req }) {
  return luxOnlyPageProps(req);
}
