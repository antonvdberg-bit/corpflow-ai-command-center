import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  listCorpFlowBrandHeadTags,
  shouldEmitCorpFlowBrandAssets,
} from '../../lib/public/corpflow-brand-assets.js';

/**
 * Host-gated CorpFlowAI favicon / app / theme metadata.
 * Emits only on CorpFlowAI business hosts (and unscoped previews).
 * Never place these links in pages/_document.js — that would brand every host.
 *
 * @param {{ host?: string | null, search?: string | null }} props
 */
export default function CorpFlowBrandMetadata({ host = null, search = null }) {
  const [emit, setEmit] = useState(() =>
    host != null ? shouldEmitCorpFlowBrandAssets(host, { search: search || '' }) : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEmit(
      shouldEmitCorpFlowBrandAssets(window.location.hostname, {
        search: window.location.search || '',
      }),
    );
  }, []);

  if (!emit) return null;

  const tags = listCorpFlowBrandHeadTags();
  return (
    <Head>
      {tags.map((tag, index) => {
        if (tag.rel) {
          return (
            <link
              key={`cf-brand-link-${index}-${tag.rel}-${tag.sizes || ''}`}
              rel={tag.rel}
              href={tag.href}
              {...(tag.type ? { type: tag.type } : {})}
              {...(tag.sizes ? { sizes: tag.sizes } : {})}
            />
          );
        }
        return (
          <meta
            key={`cf-brand-meta-${index}-${tag.name}`}
            name={tag.name}
            content={tag.content}
          />
        );
      })}
    </Head>
  );
}
