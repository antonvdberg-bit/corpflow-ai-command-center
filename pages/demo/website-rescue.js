import WebsiteRescueDemo from '../../components/WebsiteRescueDemo.js';
import ElevenLabsWebsiteVoiceChat from '../../components/ElevenLabsWebsiteVoiceChat.js';

/**
 * Public (noindex) demonstration path for Website Rescue / Premium Landing Page Rescue.
 * Issue #654 — sellable vertical slice evidence. No private client data.
 *
 * ElevenLabsWebsiteVoiceChat is mounted but DISABLED BY DEFAULT (renders null).
 * See docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md
 */
export default function WebsiteRescueDemoPage() {
  return (
    <>
      <WebsiteRescueDemo />
      <ElevenLabsWebsiteVoiceChat surface="website_rescue_demo" />
    </>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
