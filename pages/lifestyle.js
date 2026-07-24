import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import { luxOnlyPageProps } from '../lib/client/lux-host-page-props.js';

/**
 * `/lifestyle` — Rare & Exclusive Collection (Lux host only).
 */
export default function LifestylePage({ seoHost = '' }) {
  return <RareExclusiveContentPage pageId="lifestyle" seoHost={seoHost} />;
}

export async function getServerSideProps({ req }) {
  return luxOnlyPageProps(req);
}
