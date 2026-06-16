/**
 * Living Word Mauritius — visual sandbox content (v1 visual refinement).
 *
 * The sandbox at `/site-preview` is a CorpFlow-hosted, host-gated, noindex
 * test environment for the `living-word-mauritius` tenant. It is NOT the live
 * church website at livingwordmauritius.com. The persistent orange ribbon at
 * the top of the viewport (rendered by `pages/site-preview.js` via
 * `lib/sandbox/test-environment-ribbon.js`) is the single non-removable
 * sandbox marker; per-section red warning boxes were removed in v1 because
 * the persistent ribbon is sufficient and the boxes were hurting visual
 * fidelity.
 *
 * Source-of-fact policy in this module:
 *
 *   - Strings that mirror PUBLISHED public facts from the live church
 *     homepage (https://livingwordmauritius.com/) — pastor name, service
 *     time, address, phone, email, ministry names, five-pillar names — are
 *     allowed and intentionally used to give the sandbox a "recognisable
 *     facsimile" feel.
 *   - Strings that would INVENT facts not on the public site (specific
 *     upcoming event dates, donation amounts, sermon titles, leader names
 *     beyond what the homepage publishes) are NOT used. Placeholder /
 *     neutral routing copy is used instead.
 *   - Where a fact is mirrored, downstream copy is careful not to make
 *     forward-looking claims (no "we will...", no "you can register today",
 *     no implied bookings). The sandbox describes what the public site says
 *     today, not what the church plans tomorrow.
 *
 * The chatbot is loaded via a separate script tag and stays disabled
 * server-side (`enabled = false` for `living-word-mauritius`). Any "Open the
 * chat" CTAs in this content are decorative until a separate operator
 * authorisation flips the kill switch on the sandbox tenant.
 */

/**
 * @typedef {Object} Pillar
 * @property {string} id
 * @property {string} title
 * @property {string} verseRef
 * @property {string} verse
 */

/**
 * @typedef {Object} GetInvolvedItem
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} [chatCta]
 */

/**
 * @typedef {Object} NextGenItem
 * @property {string} id
 * @property {string} title
 * @property {string} ageBand
 * @property {string} body
 */

export const HERO = {
  eyebrow: 'CorpFlow sandbox · modelled on livingwordmauritius.com',
  title: 'Welcome to Living Word',
  tagline:
    'A community of Christ followers in Grand Baie, Mauritius. This is a CorpFlow test ' +
    'environment used to exercise the chatbot and supporting workflows; for the live ' +
    'church website visit livingwordmauritius.com.',
  ctaLabel: 'Connect via the chat bubble',
  ctaSubtext: 'The chat is currently disabled on the sandbox; an operator enables it for controlled tests.',
};

export const ABOUT = {
  heading: 'Welcome',
  body:
    'At its core, Living Word Mauritius is a community of Christ followers who believe in ' +
    'the divinity, death, and resurrection of Jesus Christ and are commissioned to share ' +
    'the good news of His salvation. The church believes its community transcends age, ' +
    'gender, race, geography, and socioeconomic lines.',
  source:
    'Wording mirrors the welcome paragraph published on livingwordmauritius.com. The ' +
    'real-time content of record remains the church\u2019s own website.',
};

/** @type {Pillar[]} */
export const PILLARS = [
  {
    id: 'serve',
    title: 'Serve',
    verseRef: '1 Peter 4:10',
    verse:
      'Each of you should use whatever gift you have received to serve others, as faithful ' +
      'stewards of God\u2019s grace in its various forms.',
  },
  {
    id: 'worship',
    title: 'Worship',
    verseRef: '1 Chronicles 16:29',
    verse:
      'Give to the LORD the glory he deserves! Bring your offering and come into his ' +
      'presence. Worship the Lord in all his holy splendor.',
  },
  {
    id: 'impact',
    title: 'Impact',
    verseRef: 'Mark 16:15',
    verse: '"Go into all the world and preach the gospel to all creation."',
  },
  {
    id: 'fellowship',
    title: 'Fellowship',
    verseRef: 'Hebrews 10:24\u201325',
    verse:
      'Let us think of ways to motivate one another to acts of love and good works. And ' +
      'let us not neglect our meeting together, as some people do, but encourage one another.',
  },
  {
    id: 'teach',
    title: 'Teach',
    verseRef: 'Matthew 28:20',
    verse:
      '"\u2026teach them to obey everything I have commanded you. And surely, I am with you ' +
      'always, to the very end of the age."',
  },
];

/** @type {GetInvolvedItem[]} */
export const GET_INVOLVED = [
  {
    id: 'prayer',
    title: 'Prayer Request',
    body:
      'Send a confidential prayer request. The sandbox is not a counselling or crisis ' +
      'service \u2014 if you or someone you know is in immediate danger please contact ' +
      'your local emergency services.',
    chatCta: 'Send a prayer request via the chat',
  },
  {
    id: 'wordgroups',
    title: 'WordGroups',
    body:
      'WordGroups are small-group meetings hosted across Mauritius. A church team member ' +
      'can follow up with details if you ask through the chat.',
    chatCta: 'Ask about WordGroups via the chat',
  },
  {
    id: 'volunteer',
    title: 'Serve / Volunteer',
    body:
      'Volunteer and serve opportunities are coordinated by the church team. The chat ' +
      'collects minimal adult contact details and a team member follows up.',
    chatCta: 'Express interest in serving',
  },
  {
    id: 'invite',
    title: 'Invite Someone',
    body:
      'Sharing the Living Word community with a friend or family member starts a simple ' +
      'follow-up conversation, not a sales process.',
    chatCta: 'Open the chat to invite someone',
  },
];

/** @type {NextGenItem[]} */
export const NEXT_GEN = [
  {
    id: 'children',
    title: 'Children\u2019s Church',
    ageBand: 'Ages 4\u201312',
    body:
      'A weekly programme for children. The chatbot collects only parent or guardian ' +
      'contact details and a fixed-choice age band \u2014 it never collects child names ' +
      'or other sensitive child details.',
  },
  {
    id: 'daughters-of-grace',
    title: 'Daughters of Grace',
    ageBand: 'Girls 12\u201318',
    body:
      'A youth programme for teenage girls, coordinated by the church team. Sandbox ' +
      'wording follows the same minimal-data posture as the chatbot\u2019s Youth path.',
  },
  {
    id: 'the-forge',
    title: 'The Forge',
    ageBand: 'Boys 12\u201318',
    body:
      'A youth programme for teenage boys, coordinated by the church team. Sandbox ' +
      'wording follows the same minimal-data posture as the chatbot\u2019s Youth path.',
  },
];

export const SUNDAY_SERVICE = {
  heading: 'Sunday Service',
  serviceTime: 'Sundays \u00b7 9:30 am \u00b7 In Person',
  source:
    'Service time mirrors what is published on livingwordmauritius.com today. ' +
    'For the latest service schedule visit the church website.',
};

export const LOCATION = {
  heading: 'Where we meet',
  venue: 'Living Word Church, Grand Baie',
  address:
    'Richmond Hill Building, Super U Complex, La Salette Road, Grand Baie, Mauritius',
  source: 'Address as published on livingwordmauritius.com.',
};

export const CONTACT = {
  heading: 'Contact',
  email: 'info@livingwordmauritius.com',
  phone: '+230 5538 2181',
  note:
    'These details mirror the public Living Word Mauritius contact page. The ' +
    'authoritative copy of record remains the church website. The CorpFlow chat ' +
    'on this sandbox does not currently route to these channels.',
};

export const EVENTS_PLACEHOLDER = {
  heading: 'Upcoming events',
  body:
    'Real upcoming events, dates, and venues are published on livingwordmauritius.com. ' +
    'The entries listed below come from the sandbox schedule fixture file and exist only ' +
    'so the schedule data shape can be exercised by future packets.',
};

export const NEXT_STEP = {
  heading: 'Next step \u00b7 New Believers',
  body:
    'Embarking on a journey of faith as a new follower of Jesus is supported by the ' +
    'church team. The sandbox does not run a sign-up process; for that, use the live ' +
    'church website or send a message via the chat below when an operator enables it.',
};

export const NAV = [
  { id: 'about', label: 'Welcome' },
  { id: 'pillars', label: 'What we stand for' },
  { id: 'get-involved', label: 'Get involved' },
  { id: 'next-gen', label: 'Next generation' },
  { id: 'service', label: 'Sunday' },
  { id: 'events', label: 'Events' },
  { id: 'contact', label: 'Contact' },
];

/**
 * Stable footer wording. References the live church website explicitly so the
 * tester (and anyone the URL leaks to) is reminded where the real content
 * lives.
 */
export const FOOTER = {
  brand: 'Living Word Mauritius',
  sandboxNote:
    'CorpFlow sandbox \u00b7 modelled on the public Living Word Mauritius website. ' +
    'For the real church website visit livingwordmauritius.com.',
  copyrightLine:
    '\u00a9 Living Word Mauritius (real church). This page is operated by CorpFlow ' +
    'as a tenant test environment.',
};
