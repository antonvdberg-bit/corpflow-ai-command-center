/**
 * Living Word TEST DEMO form chain — shared field definitions (client + server safe).
 */

export const FORM1_MEMBER_TYPES = Object.freeze([
  { value: 'member', label: 'Member' },
  { value: 'visitor', label: 'Visitor' },
]);

export const GENDER_OPTIONS = Object.freeze([
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]);

export const COMM_PREF_OPTIONS = Object.freeze([
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
]);

export const COUNTRY_OPTIONS = Object.freeze([{ value: 'MU', label: 'Mauritius' }]);

export const YN_OPTIONS = Object.freeze([
  { value: '', label: 'Please select Y/N' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]);

export const TEAM_ACTIVE_FIELDS = Object.freeze([
  { key: 'ushers_team_active', label: 'Ushers Team Active' },
  { key: 'trinity_kids_active', label: 'Trinity Kids Active' },
  { key: 'worship_team_active', label: 'Worship Team Active' },
  { key: 'wordgroups_active', label: 'WordGroups Active' },
  { key: 'prayer_team_active', label: 'Prayer Team Active' },
  { key: 'mens_ignite_active', label: "Men's Ignite Active" },
  { key: 'tech_media_team_active', label: 'Tech & Media Team Active' },
  { key: 'events_lifestyle_active', label: 'Events & Lifestyle Active' },
  { key: 'barista_team_active', label: 'Barista Team Active' },
]);

export const FORM2_STEP_LABELS = Object.freeze([
  'Contact & location',
  'Personal info',
  'Teams (1 of 2)',
  'Teams (2 of 2)',
]);

export const TRANSACTIONAL_CONSENT_TEXT =
  'By checking this box, I consent to receive transactional messages related to my account, orders, or services I have requested. These messages may include appointment reminders, and notifications among others. Message frequency may vary. Reply HELP for help or STOP to opt-out.';

export const TEST_DEMO_CONSENT_TEXT =
  'I confirm this TEST DEMO submission may be reviewed by operators. No real member record is updated automatically.';

/** @returns {Record<string, unknown>} */
export function emptyForm2State() {
  return {
    email_confirm: '',
    email_secondary: '',
    city: '',
    country: 'MU',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    gender: '',
    preferred_communication: '',
    date_of_birth: '',
    whatsapp_number: '',
    phone_secondary: '',
    consent_transactional: false,
    ushers_team_active: '',
    trinity_kids_active: '',
    worship_team_active: '',
    wordgroups_active: '',
    prayer_team_active: '',
    mens_ignite_active: '',
    tech_media_team_active: '',
    events_lifestyle_active: '',
    barista_team_active: '',
    consent_acknowledged: false,
  };
}
