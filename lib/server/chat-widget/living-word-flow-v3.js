/**
 * Living Word Mauritius — chat widget flow v3 (contact UX v0.1).
 *
 * Extends v2 copy with richer contact capture + post-submit menu.
 * Exported for seed/update scripts and tests.
 */

export const LIVING_WORD_FLOW_V3 = {
  schema_version: 1,
  root: 'welcome',
  nodes: {
    welcome: {
      type: 'menu',
      prompt: 'Hi! Welcome to Living Word Mauritius. How can we help today?',
      options: [
        { label: 'Service times', next: 'service-times' },
        { label: 'Find us', next: 'location' },
        { label: 'Prayer request', next: 'prayer-disclaimer' },
        { label: 'Contact the church', next: 'contact-first-name' },
        { label: 'Volunteer / Serve', next: 'volunteer-name' },
        { label: 'WordGroups', next: 'wordgroups-info' },
        { label: 'Youth / Children', next: 'youth-name' },
        { label: 'Business Network', next: 'network-info' },
        { label: 'Ask a question', next: 'welcome', widget_action: 'ai_ask' },
      ],
    },

    'service-times': {
      type: 'info',
      prompt:
        'Service times can change with the church calendar. Please check the Living Word Mauritius website for the latest service times.',
      next: 'anything-else',
    },

    location: {
      type: 'info',
      prompt:
        'Please check the Living Word Mauritius website for the latest address and how to find us.',
      next: 'anything-else',
    },

    'prayer-disclaimer': {
      type: 'info',
      prompt:
        'Prayer requests are read by a small pastoral team. We are not a counselling or crisis service — if you or someone you know is in immediate danger, please call your local emergency services. Continue if you\'d like to share a request.',
      options: [
        { label: 'Continue with prayer request', next: 'prayer-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },
    'prayer-name': {
      type: 'collect_field',
      prompt: 'What is your name?',
      field: 'name',
      required: true,
      next: 'prayer-email',
    },
    'prayer-email': {
      type: 'collect_field',
      prompt: 'What is your email? (optional)',
      field: 'email',
      required: false,
      next: 'prayer-message',
    },
    'prayer-message': {
      type: 'collect_field',
      prompt: 'Please share your prayer request.',
      field: 'message',
      required: true,
      next: 'prayer-submit',
    },
    'prayer-submit': {
      type: 'submit',
      request_type: 'prayer',
      prompt: 'Thank you. Your request has been received and will be read by the pastoral team. May God bless you.',
      next_after: 'request-complete',
    },

    'contact-first-name': {
      type: 'collect_field',
      prompt: 'What is your first name?',
      field: 'first_name',
      required: true,
      next: 'contact-surname',
    },
    'contact-surname': {
      type: 'collect_field',
      prompt: 'What is your surname / last name?',
      field: 'surname',
      required: true,
      next: 'contact-email',
    },
    'contact-email': {
      type: 'collect_field',
      prompt: 'What is your email?',
      field: 'email',
      required: true,
      next: 'contact-whatsapp',
    },
    'contact-whatsapp': {
      type: 'collect_field',
      prompt: 'What is your WhatsApp or mobile number?',
      field: 'phone',
      required: true,
      next: 'contact-preferred-method',
    },
    'contact-preferred-method': {
      type: 'menu',
      prompt: 'How would you prefer to be contacted?',
      options: [
        {
          label: 'Email',
          next: 'contact-pref-email',
          store_field: 'preferred_contact_method',
          store_value: 'email',
        },
        {
          label: 'WhatsApp',
          next: 'contact-pref-whatsapp',
          store_field: 'preferred_contact_method',
          store_value: 'whatsapp',
        },
        {
          label: 'Phone call',
          next: 'contact-pref-phone',
          store_field: 'preferred_contact_method',
          store_value: 'phone_call',
        },
        {
          label: 'SMS',
          next: 'contact-pref-sms',
          store_field: 'preferred_contact_method',
          store_value: 'sms',
        },
      ],
    },
    'contact-pref-email': {
      type: 'info',
      prompt: 'Preferred contact: Email.',
      next: 'contact-message',
    },
    'contact-pref-whatsapp': {
      type: 'info',
      prompt: 'Preferred contact: WhatsApp.',
      next: 'contact-message',
    },
    'contact-pref-phone': {
      type: 'info',
      prompt: 'Preferred contact: Phone call.',
      next: 'contact-message',
    },
    'contact-pref-sms': {
      type: 'info',
      prompt: 'Preferred contact: SMS.',
      next: 'contact-message',
    },
    'contact-message': {
      type: 'collect_field',
      prompt: 'How can we help you?',
      field: 'message',
      required: true,
      next: 'contact-submit',
    },
    'contact-submit': {
      type: 'submit',
      request_type: 'contact',
      prompt: 'Submitting your request…',
      next_after: 'request-complete',
    },

    'volunteer-name': {
      type: 'collect_field',
      prompt: 'What is your name?',
      field: 'name',
      required: true,
      next: 'volunteer-email',
    },
    'volunteer-email': {
      type: 'collect_field',
      prompt: 'What is your email?',
      field: 'email',
      required: true,
      next: 'volunteer-area',
    },
    'volunteer-area': {
      type: 'collect_field',
      prompt:
        'Which area would you like to serve in? A church team member can match you to the right team.',
      field: 'message',
      required: true,
      next: 'volunteer-submit',
    },
    'volunteer-submit': {
      type: 'submit',
      request_type: 'volunteer',
      prompt: 'Thank you for offering to serve. The volunteer coordinator will follow up by email.',
      next_after: 'request-complete',
    },

    'wordgroups-info': {
      type: 'info',
      prompt:
        'For up-to-date WordGroups information, please check the Living Word Mauritius website. A church team member can follow up with you about WordGroups if you\'d like.',
      options: [
        { label: 'Have someone follow up with me about WordGroups', next: 'contact-first-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },

    'youth-name': {
      type: 'collect_field',
      prompt: 'Parent or guardian name?',
      field: 'name',
      required: true,
      next: 'youth-email',
    },
    'youth-email': {
      type: 'collect_field',
      prompt: 'Parent or guardian email?',
      field: 'email',
      required: true,
      next: 'youth-band',
    },
    'youth-band': {
      type: 'menu',
      prompt:
        'Which age range is this enquiry about? Please do not enter a child\'s name or other personal details in this chat — those can be shared safely once a team member contacts you.',
      options: [
        { label: 'Children (under 12)', next: 'youth-message' },
        { label: 'Youth (13–18)', next: 'youth-message' },
        { label: 'Young adults (19–25)', next: 'youth-message' },
      ],
    },
    'youth-message': {
      type: 'collect_field',
      prompt: 'Anything else we should know?',
      field: 'message',
      required: false,
      next: 'youth-submit',
    },
    'youth-submit': {
      type: 'submit',
      request_type: 'youth',
      prompt:
        'Thank you. A church team member will follow up with the parent or guardian by email. Please do not share children\'s personal details in chat — those can be shared safely once a team member contacts you.',
      next_after: 'request-complete',
    },

    'network-info': {
      type: 'info',
      prompt:
        'For up-to-date Business Network information, please check the Living Word Mauritius Business Network site. A church team member can follow up if you\'d like an introduction.',
      options: [
        { label: 'Have someone follow up with me about the Business Network', next: 'contact-first-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },

    'request-complete': {
      type: 'menu',
      prompt:
        'Thank you — your request has been received. Someone from Living Word will follow up.',
      options: [
        { label: 'Back to main menu', next: 'welcome' },
        { label: 'Submit another request', next: 'welcome', widget_action: 'restart' },
        { label: 'Close chat', next: 'welcome', widget_action: 'close' },
      ],
    },

    'anything-else': {
      type: 'menu',
      prompt: 'Anything else?',
      options: [
        { label: 'Yes, take me back to the menu', next: 'welcome' },
        { label: 'No, thanks', next: 'goodbye' },
      ],
    },

    goodbye: {
      type: 'info',
      prompt: 'Thanks for visiting. May God bless you today.',
    },
  },
};

/** @deprecated alias */
export const LIVING_WORD_FLOW_V2 = LIVING_WORD_FLOW_V3;
