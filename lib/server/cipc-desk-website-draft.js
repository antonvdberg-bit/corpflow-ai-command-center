/**
 * CIPC Desk standing corpflow_test website draft (fictional / provisional).
 * Presentation-aligned with CorpFlowAI public visual language (photo + glass tokens).
 * Bump CIPC_DESK_WEBSITE_DRAFT_VERSION when content must refresh on existing personas.
 */

export const CIPC_DESK_WEBSITE_DRAFT_VERSION = 'cipc-desk-website-draft-v6-partner-funnel';

const OWNER_EMAIL = 'swart829@gmail.com';

function mailto(subject) {
  return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/**
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskWebsiteDraft() {
  const seedNote =
    'Internal corpflow_test surface — fictional example only. Service requirements, documents, turnaround and pricing must be validated by Serah Fourie before any client work. CorpFlowAI is not CIPC, not a law firm, and not an authorised representative.';

  return {
    content_version: CIPC_DESK_WEBSITE_DRAFT_VERSION,
    // CorpFlowAI palette so generic TenantSite fallback is not Lux-gold.
    theme: {
      background: '#06111f',
      surface: '#0b1f33',
      text: '#eef6ff',
      muted: '#aebfd1',
      primary: '#2dd4bf',
      accent: '#7dd3fc',
    },
    media: {
      // Reuse governed CorpFlow process hero (professional coastal / delivery atmosphere).
      hero_image_url: '/assets/visuals/corpflow-process-hero.jpg',
      visual_key: 'process',
    },
    meta: {
      page_title: 'CIPC Desk · Company administration support',
      console_heading: 'CIPC Desk · Change Console',
      guide_title: 'CIPC Desk · How to request a service',
      surface_label: 'CIPC Desk',
      description:
        'CIPC Desk — professional South African CIPC and company-secretarial administration support. Clear process, email-first contact. Provisional catalogue pending Serah validation.',
    },
    hero: {
      title: 'CIPC Desk',
      headline: 'Clear company administration — handled with care',
      tagline:
        'Professional support for registrations, amendments, annual returns, records and compliance-related administration. Email your matter; we confirm scope before anything proceeds.',
      cta_label: 'Email your CIPC matter',
      cta_href: mailto('CIPC Desk · Direct SME enquiry'),
      cta_secondary_label: 'Discuss overflow / white-label support',
      cta_secondary_href: '/partners',
    },
    sections: {
      about: {
        title: 'How the email-first desk works',
        body:
          `${seedNote}\n\n` +
          '1) Email your matter (business owner or professional-partner path).\n' +
          '2) Serah reviews scope and confirms what is needed.\n' +
          '3) You receive a drafted status update for guided decisions — nothing is filed until scope is confirmed.\n\n' +
          'Operators keep the durable record in /change. This site is not a substitute for professional legal advice.',
      },
      routes: {
        title: 'Two entry routes — one clear process',
        intro:
          'One shared operating path for both customer types. Choose the path that matches who is emailing. Filings and fees stay provisional until Serah validates.',
        items: [
          {
            name: 'Direct SME / business owner',
            detail:
              'Company registration, director changes, annual returns, beneficial ownership, address changes, and ongoing CIPC administration support for the company itself.',
            cta_label: 'Email SME enquiry',
            cta_href: mailto('CIPC Desk · Direct SME enquiry'),
          },
          {
            name: 'Accountant / tax practitioner / professional partner',
            detail:
              'Overflow or white-label company-secretarial capacity behind your firm. Use the partner page for a short scoping conversation — this is not the direct SME filing path.',
            cta_label: 'Discuss overflow / white-label support',
            cta_href: '/partners',
          },
        ],
      },
      services: {
        title: 'Services we can help administer',
        intro:
          'Concise provisional catalogue for the standing test tenant. Every item is provisional until Serah validates exact scope, documents, exclusions, and fees. This is not a public price list and does not guarantee regulatory outcomes.',
        items: [
          {
            name: 'Private-company registration',
            detail: 'Request a first-slice plan. Name reservation, incorporation pack, and beneficial-ownership setup need Serah’s professional validation.',
          },
          {
            name: 'Director appointments & resignations',
            detail: 'Email the matter summary. Serah confirms filings and the identity / consent information required.',
          },
          {
            name: 'Registered-address changes',
            detail: 'Draft next steps and required proofs of address, subject to Serah validation.',
          },
          {
            name: 'Annual returns',
            detail:
              'Confirm turnover band, beneficial-ownership status, and timing. Official CIPC fees are separate from any service fee. Specialist review surface: /annual-returns (corpflow_test).',
            href: '/annual-returns',
          },
          {
            name: 'Beneficial ownership submissions',
            detail:
              'Confirm natural-person owners/controllers and supporting items for the common path. Trusts, juristic persons, foreign ownership, and layered control escalate to specialist review. Specialist review surface: /beneficial-ownership (corpflow_test).',
            href: '/beneficial-ownership',
          },
          {
            name: 'Company amendments & maintenance',
            detail: 'Name, MOI, share, and other amendments — exact forms confirmed after email review.',
          },
          {
            name: 'Statutory records & document retrieval',
            detail: 'Retrieve or prepare company documents once identifiers and authority are confirmed.',
          },
          {
            name: 'Monthly CIPC administration support',
            detail: 'Managed cadence for clients who want reminders and filing support. Scope validated per engagement.',
          },
        ],
      },
      trust: {
        title: 'What you can expect',
        items: [
          {
            name: 'Professional and clear',
            detail: 'Plain English updates. Scope confirmed before work starts.',
          },
          {
            name: 'Dependable process',
            detail: 'Email-first contact with a durable operator record — no guessing where your matter sits.',
          },
          {
            name: 'Trust without overclaim',
            detail: 'We do not invent deadlines, fees, or regulatory outcomes. Serah validates every engagement.',
          },
        ],
      },
      contact: {
        title: 'Contact',
        email: OWNER_EMAIL,
        phone: null,
        website: null,
        note: 'Email is the primary client interaction layer on this test surface. WhatsApp may be added later only with Anton approval.',
      },
    },
  };
}
