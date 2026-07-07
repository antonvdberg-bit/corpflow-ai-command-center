/**
 * Living Word Mauritius — TEST DEMO chat flow (ask-only).
 *
 * Replaces the eight guided menu bubbles with a single retrieval-AI path.
 * Used at runtime for tenant `living-word-mauritius` (handlers overlay).
 */

export const LIVING_WORD_FLOW_ASK_ONLY = {
  schema_version: 1,
  root: 'welcome',
  nodes: {
    welcome: {
      type: 'menu',
      prompt: 'Welcome to Living Word Mauritius. Ask a question about service times, location, ministries, and more.',
      options: [{ label: 'Ask a Question', next: 'welcome', widget_action: 'ai_ask' }],
    },
  },
};
