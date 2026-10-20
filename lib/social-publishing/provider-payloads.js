import { validateSocialPostManifest } from './manifest.js';

function requireDryRunPost(post) {
  const validation = validateSocialPostManifest(post);
  if (!validation.ok) {
    throw new Error(`invalid_social_post:${validation.errors.join(',')}`);
  }
  if (post.approvalState !== 'APPROVED') {
    throw new Error('post_not_approved');
  }
  return validation.normalized;
}

export function buildProviderDryRun(post) {
  const value = requireDryRunPost(post);

  if (value.channel === 'facebook') {
    return {
      provider: 'meta',
      channel: 'facebook',
      operation: 'page_photo_post',
      endpointTemplate: '/{page-id}/photos',
      body: {
        message: value.caption,
        mediaRef: value.mediaRef,
      },
      idempotencyKey: value.id,
    };
  }

  if (value.channel === 'instagram') {
    return {
      provider: 'meta',
      channel: 'instagram',
      operation: 'single_image_publish',
      steps: [
        {
          endpointTemplate: '/{ig-user-id}/media',
          body: {
            imageRef: value.mediaRef,
            caption: value.caption,
          },
        },
        {
          endpointTemplate: '/{ig-user-id}/media_publish',
          body: {
            creationIdFromPreviousStep: true,
          },
        },
      ],
      idempotencyKey: value.id,
    };
  }

  if (value.channel === 'google_business_profile') {
    return {
      provider: 'google_business_profile',
      channel: 'google_business_profile',
      operation: 'local_post',
      endpointTemplate: '/v4/{parent=accounts/*/locations/*}/localPosts',
      body: {
        languageCode: 'en',
        summary: value.caption,
        mediaRef: value.mediaRef,
        topicType: 'STANDARD',
      },
      idempotencyKey: value.id,
    };
  }

  throw new Error('unsupported_channel');
}

export function buildCampaignDryRun(posts) {
  return posts.map((post) => ({
    postId: post.id,
    scheduledAt: post.scheduledAt,
    timezone: post.timezone,
    payload: buildProviderDryRun(post),
  }));
}
