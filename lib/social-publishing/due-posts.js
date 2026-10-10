import { validateSocialPostManifest } from './manifest.js';

export function isPostDue(post, now = new Date()) {
  const validation = validateSocialPostManifest(post);
  if (!validation.ok) return false;
  if (post.approvalState !== 'APPROVED') return false;
  if (post.publishState !== 'READY') return false;
  if (post.providerPostId) return false;
  if (post.verificationState === 'VERIFIED') return false;

  const scheduled = new Date(post.scheduledAt);
  const clock = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(clock.getTime())) throw new Error('invalid_now');
  return scheduled.getTime() <= clock.getTime();
}

export function selectDuePosts(posts, now = new Date()) {
  if (!Array.isArray(posts)) throw new Error('posts_must_be_array');
  return posts
    .filter((post) => isPostDue(post, now))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export function executionReceipt(post, providerResult) {
  if (!post?.id) throw new Error('post_id_required');
  if (!providerResult?.providerPostId) throw new Error('provider_post_id_required');

  return {
    postId: post.id,
    idempotencyKey: post.id,
    providerPostId: String(providerResult.providerPostId),
    publishState: 'PUBLISHED',
    verificationState: 'NOT_CHECKED',
    publishedAt: providerResult.publishedAt || new Date().toISOString(),
    failureReason: null,
  };
}
