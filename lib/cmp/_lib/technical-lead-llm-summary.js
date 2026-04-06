/**
 * Optional client-facing rephrase of the deterministic Technical Lead summary.
 * Uses only structured summary + gap ids/severities (no raw tokens). Off unless explicitly enabled.
 */

import { cfg } from '../../server/runtime-config.js';

/**
 * @param {{ summary: string, gaps: Array<{ id: string, severity: string, detail?: string }> }} input
 * @returns {Promise<string | null>}
 */
export async function maybeRephraseTechnicalLeadSummary(input) {
  const enabled = String(cfg('CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY', '') || '')
    .trim()
    .toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') return null;

  const key = String(cfg('GROQ_API_KEY', '') || process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;

  const model = String(cfg('CORPFLOW_TECHNICAL_LEAD_LLM_MODEL', '') || '').trim() || 'llama-3.3-70b-versatile';
  const summary = String(input.summary || '').slice(0, 800);
  const gaps = Array.isArray(input.gaps) ? input.gaps : [];
  const gapLines = gaps
    .map((g) => `- ${g.severity}: ${g.id}${g.detail ? ` — ${String(g.detail).slice(0, 120)}` : ''}`)
    .join('\n');

  const userPayload = JSON.stringify(
    { deterministic_summary: summary, gaps: gaps.map((g) => ({ id: g.id, severity: g.severity })) },
    null,
    0,
  );

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
            content: `Deterministic summary:\n${summary}\n\nGaps (reference):\n${gapLines || '(none)'}\n\nJSON (machine-readable):\n${userPayload}`,
          },
        ],
      }),
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
