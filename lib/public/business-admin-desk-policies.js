/**
 * Business Admin Desk policy copy for host-specific /terms, /privacy and /refund-policy.
 * Open commercial and legal decisions are listed separately and are not customer rights.
 */

export const BAD_POLICY_REVISION_LABEL =
  'Page revised 20 October 2026. This is a page-revision date, not an approved legal effective date.';

export const BAD_POLICY_OPERATOR_SENTENCE =
  'Business Admin Desk is a service brand operated by CorpFlowAI Ltd.';

export const BAD_POLICY_INTRO =
  'This page describes the Business Admin Desk website and the company-administration packages listed on the pricing page. It does not describe other products sold under the CorpFlowAI brand.';

export const BAD_PENDING_APPROVAL_HEADING = 'Requires commercial or legal approval';

export const BAD_PENDING_APPROVAL_INTRO =
  'The items below are open decisions. They are not customer rights, refund promises, tax conclusions or a statement that card checkout is active.';

export const BAD_PENDING_DECISIONS = Object.freeze([
  'Whether the published ZAR service fee includes South African VAT or any other tax.',
  'Whether any cooling-off, cancellation window or mandatory consumer refund right applies to these business packages.',
  'If card checkout is later approved, whether Paddle or another provider is merchant of record for those transactions, and which buyer terms then apply.',
  'A retention period, a named lawful basis, and international-transfer wording for personal information, including company records that identify directors, shareholders or other people.',
  'The governing-law clause for a confirmed Business Admin Desk instruction. CorpFlowAI Ltd is incorporated in Mauritius; the contract terms for a specific instruction are not settled on this page.',
]);

export const BAD_TERMS_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'operator',
    heading: 'Who operates Business Admin Desk',
    paragraphs: Object.freeze([
      BAD_POLICY_OPERATOR_SENTENCE,
      'CorpFlowAI Ltd is the legal operator. Business Admin Desk is the service brand used for these company-administration packages.',
      BAD_POLICY_INTRO,
    ]),
  }),
  Object.freeze({
    id: 'packages',
    heading: 'What a package is',
    paragraphs: Object.freeze([
      'A package is one integrated, software-managed company-administration process. Software workflow management and controlled human execution are parts of that same package. They are not sold as a separate labour menu.',
      'The pricing page lists the approved one-time service fee for each package. Fully automated filing, live workflow automation and online card checkout are not in operation on this website.',
      'Sending an enquiry, or reading a price, does not create a contract. A package starts only when the company, the required information, the service fee, any separate government or statutory fee, and the payment route are confirmed in writing.',
    ]),
  }),
  Object.freeze({
    id: 'fees',
    heading: 'Service fees and statutory fees',
    paragraphs: Object.freeze([
      'The ZAR amounts on the pricing page are one-time service fees for the named packages.',
      'Government and statutory fees are charged separately. They are not included in the service fee.',
      'Complex structures, cleanup and work outside the named package are quoted separately. A second package is a separate instruction.',
    ]),
  }),
  Object.freeze({
    id: 'limits',
    heading: 'Limits',
    paragraphs: Object.freeze([
      'Business Admin Desk is not a government or regulatory service and not a law firm. Nothing on this website guarantees that an authority will accept a filing, or how quickly an authority will act.',
      'You are responsible for the accuracy of the company information you supply and for lawful use of the service.',
    ]),
  }),
  Object.freeze({
    id: 'payment',
    heading: 'Payment on this website',
    paragraphs: Object.freeze([
      'Online checkout is not available. This website does not collect card numbers or bank details.',
      'Until a written instruction confirms a payment route, no card-payment terms are in force on this website. CorpFlowAI Ltd remains the legal operator either way.',
    ]),
  }),
]);

export const BAD_PRIVACY_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'operator',
    heading: 'Who is responsible',
    paragraphs: Object.freeze([
      BAD_POLICY_OPERATOR_SENTENCE,
      'CorpFlowAI Ltd is the legal operator responsible for this website. Questions about information supplied to Business Admin Desk can be sent to info@businessadmindesk.co.za.',
      BAD_POLICY_INTRO,
    ]),
  }),
  Object.freeze({
    id: 'collect',
    heading: 'Information this website handles',
    paragraphs: Object.freeze([
      'If you email us or ask about a package, we receive the contact details and company information you choose to send, such as your name, email address, phone number, company name and the records needed to understand that package.',
      'We use that information to reply, to confirm whether a published package fits, and, if you later confirm an instruction in writing, to carry out that package.',
      'Online checkout is not available. We do not sell personal information. This website does not collect card numbers or bank details.',
    ]),
  }),
  Object.freeze({
    id: 'care',
    heading: 'Before you send identity records',
    paragraphs: Object.freeze([
      'Do not send identity-document numbers or other sensitive records about directors, shareholders or customers by ordinary email until a written instruction says how those records will be handled.',
    ]),
  }),
]);

export const BAD_DELIVERY_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'what',
    heading: 'What delivery means for a package',
    paragraphs: Object.freeze([
      BAD_POLICY_OPERATOR_SENTENCE,
      'A Business Admin Desk package is a company-administration process, not a physical product. Nothing is posted or couriered.',
      'The written instruction for a package confirms the information required, the service fee, any separate government or statutory fee, and what completion looks like. This page does not promise a number of days.',
      'Online checkout is not available. Reading this page does not start delivery.',
    ]),
  }),
]);

export const BAD_PAYMENT_SECURITY_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'current',
    heading: 'Card details on this website',
    paragraphs: Object.freeze([
      BAD_POLICY_OPERATOR_SENTENCE,
      'Online checkout is not available. This website does not collect, transmit or store card numbers, security codes or bank details.',
      'No card scheme or payment provider should be read as accepted on this website today.',
    ]),
  }),
]);

export const BAD_REFUND_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'operator',
    heading: 'Which services this page covers',
    paragraphs: Object.freeze([
      BAD_POLICY_OPERATOR_SENTENCE,
      'This page is the Business Admin Desk refund and cancellation notice. It does not set the refund terms for other products sold under the CorpFlowAI brand.',
    ]),
  }),
  Object.freeze({
    id: 'current',
    heading: 'What is true today',
    paragraphs: Object.freeze([
      'Online checkout is not available, so this website has no live card-refund flow.',
      'This page does not create a refund right, a cooling-off period or a cancellation window.',
      'Any refund or cancellation term applies only when it is written into the confirmed instruction for that package. An earlier written agreement keeps the terms that were confirmed for that agreement.',
      'Government and statutory fees are separate from the service fee. This page does not promise that an authority will return a statutory fee.',
    ]),
  }),
]);
