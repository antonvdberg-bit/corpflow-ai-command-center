/**
 * AI Lead Rescue assistant — tool whitelist (exactly 2 tools, both client-side).
 *
 * Layer 3 of the six-layer guardrail floor: the model has access to NO other
 * tools, no MCP servers, no web search, no file search, no code interpreter,
 * no DB writes. The two tools below are both PURE CLIENT-SIDE — the server
 * only emits them as `function_call` items in the response; the React component
 * (`components/LeadRescueBot.js`) executes them locally.
 *
 * Specifically:
 *   - `scroll_to_intake`: scrolls the page to `#lead-rescue-intake`.
 *   - `prefill_intake_form`: populates the existing form fields; does NOT submit.
 *
 * The visitor is always the one who clicks "Request AI Lead Rescue setup".
 * The bot can never POST to /api/tenant/intake on the visitor's behalf —
 * that's a non-negotiable v1 boundary documented in the audit § 5 Q12.
 */

/**
 * @typedef {import('./openai-client.js').ResponsesToolSchema} ToolSchema
 */

/** @type {ToolSchema[]} */
export const LEAD_RESCUE_BOT_TOOLS = Object.freeze([
  {
    type: 'function',
    name: 'scroll_to_intake',
    description:
      'Smoothly scroll the page to the AI Lead Rescue intake form. Call this when the visitor signals they want to start the intake, or after you have offered to take them there. Has no parameters.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'prefill_intake_form',
    description:
      "Populate the existing intake form fields with details the visitor has already shared in chat. Does NOT submit the form — the visitor still clicks 'Request AI Lead Rescue setup' themselves. Pass only fields the visitor has actually shared; omit unknown ones. Email and phone are validated client-side; pass them only if they look plausible.",
    parameters: {
      type: 'object',
      properties: {
        business_name: {
          type: 'string',
          description: 'The business or brand name the visitor mentioned.',
        },
        contact_name: {
          type: 'string',
          description: 'The visitor’s name, if they shared it.',
        },
        email: {
          type: 'string',
          description: 'The visitor’s email address, if shared. Must look like a plausible email.',
        },
        phone: {
          type: 'string',
          description: 'The visitor’s phone or WhatsApp number, if shared.',
        },
        lead_sources: {
          type: 'string',
          description:
            'The lead sources the visitor wants connected (e.g. "WhatsApp + website form"). Free-form string.',
        },
        message: {
          type: 'string',
          description:
            'A short note about the visitor’s situation — what they want help with. Free-form.',
        },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
]);

/**
 * Whitelist of tool names the client component will actually execute. Any
 * function_call from the model with a name NOT in this set is silently
 * dropped and logged as a refusal (defensive: if the model invents a tool
 * name, we never act on it).
 *
 * @type {ReadonlySet<string>}
 */
export const LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST = Object.freeze(
  new Set(['scroll_to_intake', 'prefill_intake_form']),
);

/**
 * Field whitelist for `prefill_intake_form` arguments. Used by the client
 * component to drop any extra fields the model invents (defence in depth —
 * the JSON Schema `additionalProperties: false` should already prevent this).
 *
 * @type {ReadonlySet<string>}
 */
export const PREFILL_FIELD_ALLOWLIST = Object.freeze(
  new Set(['business_name', 'contact_name', 'email', 'phone', 'lead_sources', 'message']),
);
