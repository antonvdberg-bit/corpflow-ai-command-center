/**
 * Optional client-facing rephrase of the deterministic Technical Lead summary.
 * Uses only structured summary + gap ids/severities (no raw tokens). Off unless explicitly enabled.
 */

import { cfg } from '../../server/runtime-config.js';
import { getGroqApiKey, groqChatCompletionsFetch, resolveGroqModel } from '../../server/groq-client.js';

/**
 * @param {{ summary: string, gaps: Array<{ id: string, severity: string, detail?: string }> }} input
 * @returns {Promise<string | null>}
 */
export async function maybeRephraseTechnicalLeadSummary(input) {
  const enabled = String(cfg('CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY', '') || '')
    .trim()
    .toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') return null;

  if (!getGroqApiKey()) return null;

  const model = resolveGroqModel('technical_lead_rephrase');
  const summary = String(input.summary || '').slice(0, 800);
  const gaps = Array.isArray(input.gaps) ? input.gaps : [];
  const gapLines = gaps
    .map((g) => `- ${g.severity}: ${g.id}${g.detail ? ` — ${String(g.detail).slice(0, 120)}` : ''}`)
    .join('\n');
  /** Stable ordering for cache-friendly providers: static system first; volatile user content last, once. */
  const gapsCompact = JSON.stringify(
    gaps.map((g) => ({ id: g.id, severity: g.severity })),
  );

  try {
    const res = await groqChatCompletionsFetch({
      model,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise project status assistant for a client-facing change console. ' +
            'Rewrite the given deterministic_summary into at most 2 short sentences of plain English. ' +
            'You may use the gap list only to clarify what is wrong — do not invent facts, URLs, or tool names not implied by the input. ' +
            'If there are zero gaps, say the build pipeline looks healthy from automated checks. ' +
            'No markdown, no bullet points in the output.',
        },
        {
          role: 'user',
          content: [
            'Deterministic summary:',
            summary,
            '',
            'Gaps (reference):',
            gapLines || '(none)',
            '',
            'GAPS_JSON:',
            gapsCompact,
          ].join('\n'),
        },
      ],
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error?.message || data?.message || `http_${res.status}`;
      return `[LLM summary unavailable: ${String(err).slice(0, 120)}]`;
    }
    const text = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content.trim() : '';
    if (!text) return null;
    return text.slice(0, 600);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `[LLM summary unavailable: ${msg.slice(0, 120)}]`;
  }
}
