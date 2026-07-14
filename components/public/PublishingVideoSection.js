import React from 'react';
import Link from 'next/link';

import { CF, cfBtnSecondary, cfCard, cfGrid } from './corpflow-public-styles.js';

function getYoutubeEmbedUrl(youtubeUrl) {
  try {
    const url = new URL(youtubeUrl);
    const videoId =
      url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : '';
  } catch {
    return '';
  }
}

function isEmbeddableVideo(video) {
  if (video?.status === 'coming_soon') return false;
  const url = typeof video?.youtubeUrl === 'string' ? video.youtubeUrl.trim() : '';
  return Boolean(url && getYoutubeEmbedUrl(url));
}

function VideoCard({ video, compact }) {
  const embedUrl = isEmbeddableVideo(video) ? getYoutubeEmbedUrl(video.youtubeUrl.trim()) : '';

  return (
    <article style={{ ...cfCard, padding: compact ? 18 : 22 }}>
      {embedUrl ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: 12, background: '#06111f' }}>
          <iframe
            title={video.title}
            src={embedUrl}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight: compact ? 132 : 180,
            borderRadius: 12,
            padding: 18,
            backgroundImage: `linear-gradient(135deg, rgba(3,16,24,0.76), rgba(4,47,46,0.82)), url("${video.poster}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            display: 'flex',
            alignItems: 'flex-end',
            border: '1px solid rgba(125,211,252,0.22)',
          }}
        >
          <span style={{ color: '#e8fffb', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Video coming soon
          </span>
        </div>
      )}
      <p style={{ margin: '16px 0 6px', color: CF.link, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {video.category}
      </p>
      <h3 style={{ margin: 0, color: CF.text, fontSize: 19 }}>{video.title}</h3>
      <p style={{ margin: '10px 0 0', color: CF.textMuted, lineHeight: 1.65, fontSize: 14 }}>{video.summary}</p>
    </article>
  );
}

/**
 * @param {{ videos: Array<object>, title?: string, body?: string, compact?: boolean, showHubLink?: boolean }} props
 */
export default function PublishingVideoSection({
  videos,
  title = 'Watch the delivery approach',
  body = 'Short practical briefings are being prepared. Approved YouTube videos will appear here without changing the page structure.',
  compact = false,
  showHubLink = true,
}) {
  if (!videos?.length) return null;

  return (
    <section style={{ marginTop: compact ? 28 : 40 }}>
      <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Video briefings</p>
      <h2 style={{ margin: '8px 0 10px', color: CF.text, fontSize: 'clamp(23px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{title}</h2>
      <p style={{ margin: '0 0 16px', color: CF.textMuted, lineHeight: 1.65, maxWidth: 760 }}>{body}</p>
      <div style={cfGrid}>
        {videos.map((video) => (
          <VideoCard key={video.slug} video={video} compact={compact} />
        ))}
      </div>
      {showHubLink ? (
        <div style={{ marginTop: 18 }}>
          <Link href="/videos" style={cfBtnSecondary}>
            View all video briefings
          </Link>
        </div>
      ) : null}
    </section>
  );
}
