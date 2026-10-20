export const SOCIAL_CHANNELS = Object.freeze([
  'facebook',
  'instagram',
  'google_business_profile',
]);

const APPROVAL_STATES = new Set(['DRAFT', 'APPROVED', 'REJECTED']);
const PUBLISH_STATES = new Set(['NOT_READY', 'READY', 'PUBLISHED', 'FAILED']);
const VERIFICATION_STATES = new Set(['NOT_CHECKED', 'VERIFIED', 'FAILED']);

function text(value) {
  return value == null ? '' : String(value).trim();
}

export function validateSocialPostManifest(post) {
  const errors = [];
  if (!post || typeof post !== 'object' || Array.isArray(post)) {
    return { ok: false, errors: ['post_must_be_object'] };
  }

  for (const field of ['id', 'tenantId', 'campaign', 'channel', 'caption', 'scheduledAt', 'timezone']) {
    if (!text(post[field])) errors.push(`${field}_required`);
  }

  if (text(post.channel) && !SOCIAL_CHANNELS.includes(text(post.channel))) {
    errors.push('unsupported_channel');
  }

  if (!text(post.mediaRef)) errors.push('media_ref_required');
  if (post.mediaRef && /^https?:\/\//i.test(text(post.mediaRef))) {
    errors.push('media_ref_must_be_internal_reference');
  }

  const approvalState = text(post.approvalState || 'DRAFT');
  const publishState = text(post.publishState || 'NOT_READY');
  const verificationState = text(post.verificationState || 'NOT_CHECKED');

  if (!APPROVAL_STATES.has(approvalState)) errors.push('invalid_approval_state');
  if (!PUBLISH_STATES.has(publishState)) errors.push('invalid_publish_state');
  if (!VERIFICATION_STATES.has(verificationState)) errors.push('invalid_verification_state');

  const scheduled = new Date(post.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) errors.push('invalid_scheduled_at');

  if (approvalState !== 'APPROVED' && publishState === 'READY') {
    errors.push('unapproved_post_cannot_be_ready');
  }

  if (text(post.providerPostId) && publishState !== 'PUBLISHED') {
    errors.push('provider_id_requires_published_state');
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: errors.length ? null : {
      ...post,
      channel: text(post.channel),
      approvalState,
      publishState,
      verificationState,
    },
  };
}

export function validateCampaign(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return { ok: false, errors: ['campaign_posts_required'], posts: [] };
  }

  const ids = new Set();
  const results = posts.map((post) => {
    const result = validateSocialPostManifest(post);
    if (ids.has(post?.id)) result.errors.push('duplicate_post_id');
    ids.add(post?.id);
    return { id: post?.id || null, ...result, ok: result.errors.length === 0 };
  });

  return {
    ok: results.every((result) => result.ok),
    errors: results.flatMap((result) => result.errors.map((error) => `${result.id || 'unknown'}:${error}`)),
    posts: results,
  };
}
