import WebsiteRescueDemo from '../../components/WebsiteRescueDemo.js';

/**
 * Public (noindex) demonstration path for Website Rescue / Premium Landing Page Rescue.
 * Issue #654 — sellable vertical slice evidence. No private client data.
 */
export default function WebsiteRescueDemoPage() {
  return <WebsiteRescueDemo />;
}

export async function getStaticProps() {
  return { props: {} };
}
