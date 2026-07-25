import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import { luxOnlyPageProps } from '../lib/client/lux-host-page-props.js';

/**
 * `/destination-mauritius` — Rare & Exclusive Collection (Lux host only).
 */
export default function DestinationMauritiusPage({ seoHost = '' }) {
  return <RareExclusiveContentPage pageId="destination" seoHost={seoHost} />;
}

export async function getServerSideProps({ req }) {
  return luxOnlyPageProps(req);
}
