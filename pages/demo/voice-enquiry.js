import Head from 'next/head';
import Link from 'next/link';

import ElevenLabsWebsiteVoiceChat from '../../components/ElevenLabsWebsiteVoiceChat.js';

/**
 * Private / noindex demo mount for the ElevenLabs website voice-chat pilot.
 * Widget remains disabled unless env flags are explicitly enabled after Anton approval.
 * See docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md
 */
export default function VoiceEnquiryDemoPage() {
  return (
    <>
      <Head>
        <title>CorpFlowAI — voice enquiry demo (gated)</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          <Link href="/">CorpFlowAI</Link> · gated voice enquiry demo · not a public launch
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.2 }}>AI voice enquiry assistant (pilot mount)</h1>
        <p style={{ lineHeight: 1.5 }}>
          This page is for controlled testing of website voice chat on CorpFlowAI-owned surfaces. The
          assistant captures Lead Rescue / Website Rescue enquiries for human review. It does not send
          email, WhatsApp, SMS, or update a CRM.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.85 }}>
          If you see no widget below, the pilot is correctly <strong>disabled by default</strong>.
          Activation requires Anton approval and env configuration — see{' '}
          <code>docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md</code>.
        </p>
        <ElevenLabsWebsiteVoiceChat surface="demo_voice_enquiry" />
      </main>
    </>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
