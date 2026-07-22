import Head from 'next/head';

import HomePage, { getServerSideProps as getBaseServerSideProps } from './index.js';

export async function getServerSideProps(context) {
  return getBaseServerSideProps(context);
}

/**
 * Public-name correction for the LuxeMaurice tenant homepage.
 *
 * The underlying tenant, routes, APIs, database records and internal identifiers
 * remain unchanged. This wrapper corrects the public hero/metadata until the
 * legacy homepage component is fully migrated to shared public-brand constants.
 */
export default function RareExclusiveHome(props) {
  return (
    <>
      <HomePage {...props} />
      <Head>
        <title>Rare &amp; Exclusive Collection · Private Wealth &amp; Lifestyle Platform for Mauritius</title>
        <meta
          name="description"
          content="Rare & Exclusive Collection — curated private opportunities, private advisory, owner experience and concierge-led access in Mauritius."
        />
        <meta
          property="og:title"
          content="Rare & Exclusive Collection · Private Wealth & Lifestyle Platform for Mauritius"
        />
        <meta
          property="og:description"
          content="Curated private opportunities, private advisory, owner experience and concierge-led access in Mauritius."
        />
        <meta
          name="twitter:title"
          content="Rare & Exclusive Collection · Private Wealth & Lifestyle Platform for Mauritius"
        />
        <meta
          name="twitter:description"
          content="Curated private opportunities, private advisory, owner experience and concierge-led access in Mauritius."
        />
        <style>{`
          /* The legacy hero has a hard-coded LuxeMaurice H1. Replace only its
             public visual label; preserve layout, typography and all runtime data. */
          main > section:first-of-type h1 {
            font-size: 0 !important;
            letter-spacing: 0 !important;
            padding-left: 0 !important;
          }
          main > section:first-of-type h1::after {
            content: 'RARE & EXCLUSIVE';
            display: block;
            font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif;
            font-weight: 400;
            font-size: clamp(2.6rem, 7vw, 5.2rem);
            letter-spacing: 0.18em;
            line-height: 1;
            padding-left: 0.18em;
            color: #F4EFE8;
            text-transform: uppercase;
          }
          main > section:nth-of-type(2) span:first-child {
            font-size: 0 !important;
          }
          main > section:nth-of-type(2) span:first-child::after {
            content: 'A note from Rare & Exclusive';
            font-size: 10.5px;
          }
        `}</style>
      </Head>
    </>
  );
}
