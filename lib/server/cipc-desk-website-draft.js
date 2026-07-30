/**
 * CIPC Desk standing corpflow_test website draft (fictional / provisional).
 * Bump CIPC_DESK_WEBSITE_DRAFT_VERSION when content must refresh on existing personas.
 */

export const CIPC_DESK_WEBSITE_DRAFT_VERSION = 'cipc-desk-website-draft-v2-commercial-slice';

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
    meta: {
      page_title: 'CIPC Desk · Internal test',
      console_heading: 'CIPC Desk · Change Console',
      guide_title: 'CIPC Desk · How to request a service',
      surface_label: 'CIPC Desk',
    },
    hero: {
      title: 'CIPC Desk',
      headline: 'South African CIPC administration — handled remotely',
      tagline: seedNote,
      cta_label: 'Email as a business owner',
      cta_href: mailto('CIPC Desk · Direct SME enquiry'),
      cta_secondary_label: 'Email as an accountant / practitioner',
      cta_secondary_href: mailto('CIPC Desk · Professional partner enquiry'),
    },
    sections: {
      about: {
        title: 'How email-first service works',
        body:
          `${seedNote}\n\n` +
          '1) Email your matter (direct SME or professional-partner path).\n' +
          '2) Serah reviews scope and confirms what is needed.\n' +
          '3) You receive a drafted status update for guided decisions — nothing is filed until scope is confirmed.\n\n' +
          'Operators keep the durable record in /change. Live email automation is not enabled on this test surface.',
      },
      routes: {
        title: 'Two entry routes (same operating system)',
        intro:
          'One shared workflow for both customer types. Choose the path that matches who is emailing. Pricing and filings stay provisional until Serah validates.',
        items: [
          {
            name: 'Direct SME / business owner',
            detail:
              'Company registration, director changes, annual returns, beneficial ownership, address changes, and ongoing CIPC admin support for the company itself.',
            cta_label: 'Email SME enquiry',
            cta_href: mailto('CIPC Desk · Direct SME enquiry'),
          },
          {
            name: 'Accountant / tax practitioner / professional partner',
            detail:
              'Batch or referred matters for your clients. Include your firm name, client company identifiers, and what you need Serah to handle versus what you retain.',
            cta_label: 'Email partner enquiry',
            cta_href: mailto('CIPC Desk · Professional partner enquiry'),
          },
        ],
      },
      services: {
        title: 'Services (provisional catalogue)',
        intro:
          'Concise first catalogue for the standing test tenant. Every item is provisional until Serah validates exact scope, documents, exclusions, and fees. Do not treat this as a public price list.',
        items: [
          {
            name: 'Private-company registration (provisional)',
            detail: 'Request the first-slice plan. Name reservation, incorporation pack, and BO setup need Serah’s professional validation.',
          },
          {
            name: 'Director appointments & resignations (provisional)',
            detail: 'Email the matter summary. Serah confirms filings and required identity / consent information.',
          },
          {
            name: 'Registered-address changes (provisional)',
            detail: 'Draft next steps and required proofs of address, subject to Serah validation.',
          },
          {
            name: 'Annual returns (provisional)',
            detail: 'Confirm turnover band, BO status, and timing. Official CIPC fees are separate from any service fee.',
          },
          {
            name: 'Beneficial ownership submissions (provisional)',
            detail: 'Confirm natural-person owners/controllers and supporting IDs before any AR hard-stop risk.',
          },
          {
            name: 'Company amendments & maintenance (provisional)',
            detail: 'Name, MOI, share, and other amendments — exact forms confirmed after email review.',
          },
          {
            name: 'Statutory records & document retrieval (provisional)',
            detail: 'Retrieve or prepare company documents once identifiers and authority are confirmed.',
          },
          {
            name: 'Monthly CIPC administration support (provisional)',
            detail: 'Managed cadence for clients who want reminders and filing support. Scope validated per engagement.',
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
