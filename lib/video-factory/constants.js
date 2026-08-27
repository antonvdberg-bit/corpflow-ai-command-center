/**
 * Website Rescue Video Factory Phase A constants (#1143 / parent #1078).
 *
 * Named-product recording path from #1127 / PR #1129. SKU aliases stay live
 * but must not be recorded as the launch-product path.
 */

export const VIDEO_SPEC_SCHEMA_ID = 'corpflow.video_spec.v1';
export const QC_REPORT_SCHEMA_ID = 'corpflow.video_qc_report.v1';
export const HEYGEN_ADAPTER_ID = 'corpflow.heygen_adapter.v1';

export const PRODUCT_NAME = 'Website Rescue';
export const PRIMARY_CTA = 'Request discovery';
export const SKU_TITLE = 'Premium Landing Page Rescue';
export const SKU_SLUG = 'premium-landing-page-rescue';
export const FICTIONAL_DEMO_BUSINESS = 'Harbour Hospitality Supplies';

export const NAMED_LANDING_PATH = '/website-rescue';
export const DEMO_PATH = '/demo/website-rescue';
export const ENQUIRY_HASH = '#discovery';
export const DEMO_ENQUIRY_HASH = '#demo-enquiry';
export const CONTACT_ENQUIRY_PATH = '/contact?offer=premium-landing-page-rescue#discovery';
export const FORBIDDEN_RECORDING_PATH = '/offers/premium-landing-page-rescue';

export const PUBLIC_ORIGIN = 'https://corpflowai.com';

export const NAMED_LANDING_URL = `${PUBLIC_ORIGIN}${NAMED_LANDING_PATH}`;
export const DEMO_URL = `${PUBLIC_ORIGIN}${DEMO_PATH}`;
export const ENQUIRY_IN_PAGE_URL = `${PUBLIC_ORIGIN}${NAMED_LANDING_PATH}${ENQUIRY_HASH}`;
export const CONTACT_ENQUIRY_URL = `${PUBLIC_ORIGIN}${CONTACT_ENQUIRY_PATH}`;
export const FORBIDDEN_RECORDING_URL = `${PUBLIC_ORIGIN}${FORBIDDEN_RECORDING_PATH}`;
export const GATEWAY_URL = `${PUBLIC_ORIGIN}/`;

export const PENDING_AVATAR_ID = 'PENDING_ANTON_AVATAR_ID';
export const PENDING_VOICE_ID = 'PENDING_ANTON_VOICE_ID';

export const ASSIGNED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
export const GENERATIVE_ID_TOKENS = Object.freeze([
  'auto',
  'automatic',
  'random',
  'best',
  'generate',
  'generative',
  'any',
  'default-select',
]);

export const LAUNCH_DURATION_MIN_SECONDS = 60;
export const LAUNCH_DURATION_MAX_SECONDS = 90;
export const CALIBRATION_DURATION_MIN_SECONDS = 20;
export const CALIBRATION_DURATION_MAX_SECONDS = 30;

export const PRIMARY_ASPECT_RATIO = '16:9';
export const PRIMARY_RESOLUTION = '1920x1080';
export const PRIMARY_FPS = 30;

export const LIVE_HEYGEN_CALL_BLOCKED = 'LIVE_HEYGEN_CALL_BLOCKED';
export const PHASE_A_TRANSPORT_MODE = 'mock';

export const VIDEO_IDS = Object.freeze({
  whatItDoes: 'cf-vid-wr-what-it-does',
  beforeAfterEnquiry: 'cf-vid-wr-before-after-enquiry',
  calibration: 'cf-vid-wr-calibration-20s',
});

export const VIDEO_TITLES = Object.freeze({
  [VIDEO_IDS.whatItDoes]: 'Website Rescue — What It Does',
  [VIDEO_IDS.beforeAfterEnquiry]: 'Website Rescue — Before, After and Enquiry Flow',
  [VIDEO_IDS.calibration]: 'Website Rescue — 20–30 second calibration (Phase B gate)',
});

export const REQUIRED_TRUST_LINE =
  'We do not guarantee new revenue. We help make the offer clear and the enquiry path usable.';

export const AI_PRESENTER_DISCLOSURE = 'AI-assisted presenter';
