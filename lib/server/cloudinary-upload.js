/**
 * Minimal Cloudinary upload for CMP image attachments (server-side only).
 *
 * Env: CORPFLOW_CLOUDINARY_CLOUD_NAME, CORPFLOW_CLOUDINARY_API_KEY, CORPFLOW_CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

import { cfg } from './runtime-config.js';

/**
 * @returns {boolean}
 */
export function isCloudinaryImageUploadConfigured() {
  const cn = String(cfg('CORPFLOW_CLOUDINARY_CLOUD_NAME', '') || '').trim();
  const key = String(cfg('CORPFLOW_CLOUDINARY_API_KEY', '') || '').trim();
  const sec = String(cfg('CORPFLOW_CLOUDINARY_API_SECRET', '') || '').trim();
  return Boolean(cn && key && sec);
}

function configure() {
  cloudinary.config({
    cloud_name: String(cfg('CORPFLOW_CLOUDINARY_CLOUD_NAME', '') || '').trim(),
    api_key: String(cfg('CORPFLOW_CLOUDINARY_API_KEY', '') || '').trim(),
    api_secret: String(cfg('CORPFLOW_CLOUDINARY_API_SECRET', '') || '').trim(),
  });
}

/**
 * @param {Buffer} buffer
 * @param {{ ticketId: string, fileName: string, contentType: string }} meta
 * @returns {Promise<{ public_id: string, secure_url: string, width: number | null, height: number | null, bytes: number | null }>}
 */
export async function uploadCmpImageBuffer(buffer, meta) {
  if (!isCloudinaryImageUploadConfigured()) {
    throw new Error('CLOUDINARY_NOT_CONFIGURED');
  }
  configure();
  const ticketId = String(meta.ticketId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const folder = `cmp-tickets/${ticketId || 'unknown'}`;
  const dataUri = `data:${meta.contentType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
  return {
    public_id: result.public_id != null ? String(result.public_id) : '',
    secure_url: result.secure_url != null ? String(result.secure_url) : '',
    width: typeof result.width === 'number' ? result.width : null,
    height: typeof result.height === 'number' ? result.height : null,
    bytes: typeof result.bytes === 'number' ? result.bytes : null,
  };
}
