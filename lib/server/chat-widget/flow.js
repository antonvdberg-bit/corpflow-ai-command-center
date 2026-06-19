/**
 * Chat Widget v0 — flow validation + advance.
 *
 * Strict schema. Four node types in v0: `menu`, `info`, `collect_field`, `submit`.
 * No AI nodes. Flow JSON is shaped:
 *
 *   {
 *     "schema_version": 1,
 *     "root": "<node_id>",
 *     "nodes": {
 *       "<node_id>": { "type": "menu" | "info" | "collect_field" | "submit", ... }
 *     }
 *   }
 *
 * Validation enforces:
 *   - root references an existing node
 *   - every `next` references an existing node
 *   - every `options[].next` references an existing node
 *   - allowed field types only
 *   - allowed request_type values per the seed
 */

const NODE_TYPES = new Set(['menu', 'info', 'collect_field', 'submit']);
const FIELD_TYPES = new Set([
  'name',
  'first_name',
  'surname',
  'email',
  'phone',
  'message',
  'request_type',
  'preferred_contact_method',
]);

/**
 * Validates a flow JSON tree. Throws on any defect with a readable message.
 *
 * @param {unknown} flow
 * @returns {{ root: string; nodes: Record<string, any> }}
 */
export function validateFlow(flow) {
  if (!flow || typeof flow !== 'object') throw new Error('flow_invalid: not_object');
  const f = /** @type {Record<string, unknown>} */ (flow);
  if (Number(f.schema_version) !== 1) throw new Error('flow_invalid: schema_version');
  const root = typeof f.root === 'string' && f.root.trim() ? f.root.trim() : '';
  if (!root) throw new Error('flow_invalid: root_missing');
  const nodes = f.nodes && typeof f.nodes === 'object' ? f.nodes : null;
  if (!nodes) throw new Error('flow_invalid: nodes_missing');
  if (!(root in /** @type {object} */ (nodes))) throw new Error('flow_invalid: root_not_a_node');
  for (const [id, raw] of Object.entries(/** @type {object} */ (nodes))) {
    if (!raw || typeof raw !== 'object') throw new Error(`flow_invalid: node_not_object:${id}`);
    const n = /** @type {Record<string, unknown>} */ (raw);
    const t = typeof n.type === 'string' ? n.type : '';
    if (!NODE_TYPES.has(t)) throw new Error(`flow_invalid: node_type:${id}:${t}`);
    if (typeof n.prompt !== 'string' || !n.prompt.trim()) {
      throw new Error(`flow_invalid: node_prompt_missing:${id}`);
    }
    if (t === 'menu') {
      const opts = Array.isArray(n.options) ? n.options : [];
      if (opts.length < 1) throw new Error(`flow_invalid: menu_no_options:${id}`);
      for (const o of opts) {
        if (!o || typeof o !== 'object') throw new Error(`flow_invalid: option_shape:${id}`);
        const oo = /** @type {Record<string, unknown>} */ (o);
        if (typeof oo.label !== 'string' || !oo.label.trim()) {
          throw new Error(`flow_invalid: option_label:${id}`);
        }
        if (typeof oo.next !== 'string' || !(oo.next in /** @type {object} */ (nodes))) {
          throw new Error(`flow_invalid: option_next:${id}:${String(oo.next)}`);
        }
      }
    } else if (t === 'info') {
      if (n.next != null && (typeof n.next !== 'string' || !(n.next in /** @type {object} */ (nodes)))) {
        throw new Error(`flow_invalid: info_next:${id}`);
      }
      if (n.options != null) {
        const opts = Array.isArray(n.options) ? n.options : [];
        for (const o of opts) {
          const oo = /** @type {Record<string, unknown>} */ (o || {});
          if (typeof oo.next !== 'string' || !(oo.next in /** @type {object} */ (nodes))) {
            throw new Error(`flow_invalid: info_option_next:${id}`);
          }
        }
      }
    } else if (t === 'collect_field') {
      const field = typeof n.field === 'string' ? n.field : '';
      if (!FIELD_TYPES.has(field)) throw new Error(`flow_invalid: field_type:${id}:${field}`);
      if (typeof n.next !== 'string' || !(n.next in /** @type {object} */ (nodes))) {
        throw new Error(`flow_invalid: collect_next:${id}`);
      }
    } else if (t === 'submit') {
      if (n.next_after != null) {
        if (typeof n.next_after !== 'string' || !(n.next_after in /** @type {object} */ (nodes))) {
          throw new Error(`flow_invalid: submit_next_after:${id}`);
        }
      }
    }
  }
  return /** @type {{ root: string; nodes: Record<string, any> }} */ ({
    root,
    nodes: /** @type {Record<string, any>} */ (nodes),
  });
}

/**
 * Returns the node by id from a validated flow.
 *
 * @param {{ nodes: Record<string, any> }} flow
 * @param {string} nodeId
 * @returns {any | null}
 */
export function getNode(flow, nodeId) {
  if (!flow || typeof flow !== 'object') return null;
  if (typeof nodeId !== 'string') return null;
  const node = flow.nodes && flow.nodes[nodeId];
  return node || null;
}

/**
 * Sanitises user input for `collect_field` nodes. Throws on disallowed shape;
 * returns trimmed plain string on success.
 *
 * @param {string} fieldType
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitiseFieldInput(fieldType, raw) {
  const v = typeof raw === 'string' ? raw : String(raw == null ? '' : raw);
  // Strip control chars + collapse whitespace.
  const cleaned = v
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (fieldType === 'email') {
    if (cleaned.length < 5 || cleaned.length > 254) throw new Error('field_email_length');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleaned)) throw new Error('field_email_format');
    return cleaned.toLowerCase();
  }
  if (fieldType === 'phone') {
    if (cleaned.length < 7 || cleaned.length > 24) throw new Error('field_phone_length');
    if (!/^[+()\-\s\d]+$/.test(cleaned)) throw new Error('field_phone_format');
    return cleaned;
  }
  if (fieldType === 'name' || fieldType === 'first_name' || fieldType === 'surname') {
    if (cleaned.length < 1 || cleaned.length > 80) throw new Error('field_name_length');
    return cleaned;
  }
  if (fieldType === 'message') {
    if (cleaned.length < 1 || cleaned.length > 2000) throw new Error('field_message_length');
    return cleaned;
  }
  if (fieldType === 'request_type') {
    if (cleaned.length < 1 || cleaned.length > 40) throw new Error('field_request_type_length');
    if (!/^[a-z0-9_-]+$/i.test(cleaned)) throw new Error('field_request_type_format');
    return cleaned.toLowerCase();
  }
  if (fieldType === 'preferred_contact_method') {
    const allowed = new Set(['email', 'whatsapp', 'phone_call', 'sms']);
    const v = cleaned.toLowerCase().replace(/\s+/g, '_');
    if (!allowed.has(v)) throw new Error('field_preferred_contact_method_invalid');
    return v;
  }
  throw new Error(`field_type_unknown:${fieldType}`);
}

/**
 * Public-safe view of a node for the widget client. Trims server-only attributes.
 *
 * @param {string} id
 * @param {any} node
 * @returns {Record<string, unknown>}
 */
export function publicNodeView(id, node) {
  if (!node) return { id, type: 'info', prompt: '' };
  const t = node.type;
  if (t === 'menu') {
    return {
      id,
      type: 'menu',
      prompt: String(node.prompt || ''),
      options: (Array.isArray(node.options) ? node.options : []).map((o) => ({
        label: String(o.label || ''),
        next: String(o.next || ''),
        ...(typeof o.widget_action === 'string' ? { widget_action: o.widget_action } : {}),
      })),
    };
  }
  if (t === 'info') {
    const out = { id, type: 'info', prompt: String(node.prompt || '') };
    if (typeof node.next === 'string') out.next = node.next;
    if (Array.isArray(node.options)) {
      out.options = node.options.map((o) => ({
        label: String((o && o.label) || ''),
        next: String((o && o.next) || ''),
        ...(o && typeof o.widget_action === 'string' ? { widget_action: o.widget_action } : {}),
      }));
    }
    return out;
  }
  if (t === 'collect_field') {
    return {
      id,
      type: 'collect_field',
      prompt: String(node.prompt || ''),
      field: String(node.field || ''),
      required: node.required !== false,
      next: String(node.next || ''),
      input_label: typeof node.input_label === 'string' ? node.input_label : null,
    };
  }
  if (t === 'submit') {
    return {
      id,
      type: 'submit',
      prompt: String(node.prompt || ''),
      request_type: typeof node.request_type === 'string' ? node.request_type : null,
    };
  }
  return { id, type: 'info', prompt: '' };
}
