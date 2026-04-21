import { extractOutcomesFromDescription, extractOutcomesFromConsoleJsonBrief } from './factory-cmp-push.js';
import { buildClarificationQuestions } from '../cmp/_lib/ai-interview.js';
import {
  pickNonDerivablePreferenceQuestions,
} from '../cmp/_lib/refinement-asset-context.js';
import { mergeChangeRefinerBriefForStorage } from './groq-contracts.js';
import { inferChangeTypeDeterministic } from './change-type-classification.js';

/**
 * When GROQ is unavailable or exhausted, still return guided clarification or explicit “ready to estimate”.
 *
 * @param {{
 *   description: string;
 *   existingBrief: Record<string, unknown>;
 *   locale: string;
 *   assetContext?: { hasImageFacts?: boolean, facts?: Array<Record<string, unknown>> };
 * }} args
 * @returns {{ assistant: string, brief: Record<string, unknown>, refinement_source: 'deterministic' }}
 */
export function buildDeterministicChangeRefinement(args) {
  const desc = String(args.description || '').trim();
  const prevBrief =
    args.existingBrief && typeof args.existingBrief === 'object' && !Array.isArray(args.existingBrief)
      ? args.existingBrief
      : {};
  const loc = String(args.locale || 'en').trim() || 'en';
  const assetCtx = args.assetContext || { hasImageFacts: false, facts: [] };

  let outcomes = extractOutcomesFromDescription(desc);
  if (!outcomes.length) {
    outcomes = extractOutcomesFromConsoleJsonBrief({ brief: prevBrief });
  }

  if (outcomes.length) {
    const firstLine = desc
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#'));
    const summary = (firstLine || desc).slice(0, 480);
    const value = {
      summary,
      requested_change: desc.slice(0, 8000),
      scope: 'As described in your ticket text (including stated outcomes).',
      locale: loc,
      confidence: outcomes.length >= 2 ? 'high' : 'medium',
      missing_information: [],
      change_type: inferChangeTypeDeterministic({
        description: desc,
        outcomes,
        hasMeasuredImageAssets: Boolean(assetCtx.hasImageFacts),
      }),
      client_safe_response:
        'Thanks — your request includes explicit intended outcomes, so we can move toward sizing. ' +
        'Next step: run Estimate for effort and indicative cost. If anything is still ambiguous after that, reply in this chat.',
    };
    const merged = mergeChangeRefinerBriefForStorage(prevBrief, value);
    return {
      assistant: value.client_safe_response,
      brief: merged,
      refinement_source: 'deterministic',
    };
  }

  if (assetCtx.hasImageFacts && Array.isArray(assetCtx.facts) && assetCtx.facts.length) {
    const facts = assetCtx.facts;
    const hasIssue = facts.some((f) => f && f.suitability === 'issue');
    const summaryLine = facts
      .map((f) => {
        if (f.width != null && f.height != null && f.format) {
          return `${f.file_name}: ${String(f.format).toUpperCase()} ${f.width}×${f.height}px (${Math.round((Number(f.byte_size) || 0) / 1024)} KB)`;
        }
        return `${f.file_name}: stored (${Math.round((Number(f.byte_size) || 0) / 1024)} KB)`;
      })
      .join(' — ');
    const prefs = pickNonDerivablePreferenceQuestions(desc);
    const miss = hasIssue ? [] : prefs.slice(0, 2);

    let client = '';
    if (hasIssue) {
      client =
        `We analyzed your uploaded image(s) in the system: ${summaryLine}. ` +
        'At least one file is likely too small for a full-screen hero or background. Please upload a higher-resolution source, or confirm you want a smaller non-full-bleed layout.';
    } else {
      client =
        `We analyzed your uploaded image(s): ${summaryLine}. Format, dimensions, and file size are already on file — you do not need to restate them. `;
      if (miss.length) {
        client += `Before estimating, please confirm: ${miss.join(' ')}`;
      } else {
        client += 'The asset looks suitable to proceed. Run Estimate when ready.';
      }
    }

    const value = {
      summary: desc.slice(0, 200).replace(/\s+/g, ' ').trim() || 'Change request',
      requested_change: desc.slice(0, 8000),
      scope: hasIssue ? 'Awaiting higher-resolution asset or narrower layout.' : 'Measured assets on file.',
      locale: loc,
      confidence: hasIssue ? 'medium' : miss.length ? 'low' : 'high',
      missing_information: miss,
      change_type: inferChangeTypeDeterministic({
        description: desc,
        outcomes: [],
        hasMeasuredImageAssets: true,
      }),
      client_safe_response: client,
    };
    const merged = mergeChangeRefinerBriefForStorage(prevBrief, value);
    return {
      assistant: client,
      brief: merged,
      refinement_source: 'deterministic',
    };
  }

  const { questions } = buildClarificationQuestions(desc, loc);
  const two = questions.slice(0, 2);
  const value = {
    summary: (desc.slice(0, 200).replace(/\s+/g, ' ').trim() || 'Change request').slice(0, 480),
    requested_change: desc.slice(0, 8000),
    scope: 'Pending your answers to the two questions below.',
    locale: loc,
    confidence: 'low',
    missing_information: two,
    change_type: inferChangeTypeDeterministic({
      description: desc,
      outcomes: [],
      hasMeasuredImageAssets: false,
    }),
    client_safe_response:
      'Thanks for your change request. To estimate accurately and avoid rework, here are two focused questions:\n\n' +
      `1) ${two[0]}\n\n` +
      `2) ${two[1]}\n\n` +
      'Please reply in the chat with your answers (short bullets are fine).',
  };
  const merged = mergeChangeRefinerBriefForStorage(prevBrief, value);
  return {
    assistant: value.client_safe_response,
    brief: merged,
    refinement_source: 'deterministic',
  };
}
