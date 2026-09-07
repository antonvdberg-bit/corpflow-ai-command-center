import EnquiryRecoveryCampaignPage from '../components/EnquiryRecoveryCampaignPage.js';

/**
 * Current buyer-facing campaign for the Enquiry Recovery Sprint.
 * Historic `/lead-rescue` and aileadrescue.corpflowai.com render the same page
 * so WhatsApp, homepage, and old bookmarks do not show contradictory pricing.
 */
export default function EnquiryRecoveryPage() {
  return <EnquiryRecoveryCampaignPage />;
}

export async function getStaticProps() {
  return { props: {} };
}
