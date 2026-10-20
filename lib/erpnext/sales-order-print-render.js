/**
 * Synthetic renderer for the canonical ERPNext Sales Order Print Format.
 *
 * ERPNext remains the native PDF renderer. This module fills
 * `templates/erpnext/sales-order/corpflowai-professional-sales-order.html`
 * for synthetic proof only. It is not a second production document engine:
 * it does not call ERPNext, create documents, send anything, or replace
 * native Print Format PDF generation.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const SALES_ORDER_PRINT_TEMPLATE = 'templates/erpnext/sales-order/corpflowai-professional-sales-order.html';

export const NATIVE_SALES_ORDER_PDF_GATE = Object.freeze({
  status: 'NOT_GENERATED',
  print_format: 'CorpFlowAI Professional Sales Order',
  template: SALES_ORDER_PRINT_TEMPLATE,
  pdf: null,
  reason:
    'Native PDF generation requires an approved ERPNext runtime to apply the Print Format "CorpFlowAI Professional Sales Order" and render it through the ERPNext PDF endpoint. The HTML returned here is a synthetic print preview, not a PDF.',
});

const UNDEFINED = Symbol('undefined');

export class SafeHtml {
  constructor(value) {
    this.value = String(value);
  }
}

export function markSafe(value) {
  return new SafeHtml(value);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isTruthy(value) {
  if (value == null || value === UNDEFINED || value === false) return false;
  if (value === 0 || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function asText(value) {
  if (value instanceof SafeHtml) return value.value;
  if (value == null || value === UNDEFINED) return '';
  return String(value);
}

function outputText(value) {
  if (value instanceof SafeHtml) return value.value;
  return escapeHtml(asText(value));
}

function jinjaEqual(left, right) {
  if (left === right) return true;
  if ((left === false && right === 0) || (left === 0 && right === false)) return true;
  if ((left === true && right === 1) || (left === 1 && right === true)) return true;
  if ((left == null || left === UNDEFINED) && (right == null || right === UNDEFINED)) return true;
  return false;
}

function childScope(parent) {
  return { parent, vars: Object.create(null) };
}

function lookup(scope, name) {
  if (name === 'true' || name === 'True') return true;
  if (name === 'false' || name === 'False') return false;
  if (name === 'none' || name === 'None' || name === 'null') return null;
  let current = scope;
  while (current) {
    if (Object.prototype.hasOwnProperty.call(current.vars, name)) return current.vars[name];
    current = current.parent;
  }
  return UNDEFINED;
}

function getattr(object, name) {
  if (object == null || object === UNDEFINED) return UNDEFINED;
  const value = object[name];
  return value === undefined ? UNDEFINED : value;
}

function namespace(kwargs = {}) {
  return { ...kwargs };
}

function applyFilter(value, name, args) {
  if (name === 'safe') {
    return value instanceof SafeHtml ? value : new SafeHtml(escapeHtml(asText(value)));
  }
  if (name === 'replace') {
    const source = asText(value);
    const replaced = source.split(asText(args[0])).join(asText(args[1]));
    return value instanceof SafeHtml ? new SafeHtml(replaced) : replaced;
  }
  const error = new Error(`UNKNOWN_PRINT_FILTER:${name}`);
  error.code = 'UNKNOWN_PRINT_FILTER';
  throw error;
}

function lex(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      let cursor = index + 1;
      let text = '';
      while (cursor < input.length && input[cursor] !== char) {
        if (input[cursor] === '\\') {
          text += input[cursor + 1] || '';
          cursor += 2;
          continue;
        }
        text += input[cursor];
        cursor += 1;
      }
      tokens.push({ type: 'string', value: text });
      index = cursor + 1;
      continue;
    }
    if (/[0-9]/.test(char)) {
      let cursor = index + 1;
      while (cursor < input.length && /[0-9.]/.test(input[cursor])) cursor += 1;
      tokens.push({ type: 'number', value: Number(input.slice(index, cursor)) });
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let cursor = index + 1;
      while (cursor < input.length && /[A-Za-z0-9_]/.test(input[cursor])) cursor += 1;
      tokens.push({ type: 'word', value: input.slice(index, cursor) });
      index = cursor;
      continue;
    }
    const two = input.slice(index, index + 2);
    if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
      tokens.push({ type: 'op', value: two });
      index += 2;
      continue;
    }
    if ('~+-*/().,[]|=<>'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index += 1;
      continue;
    }
    const error = new Error(`PRINT_TEMPLATE_LEX:${input.slice(index, index + 12)}`);
    error.code = 'PRINT_TEMPLATE_LEX';
    throw error;
  }
  return tokens;
}

class ExprParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  peek() {
    return this.tokens[this.index] || null;
  }

  eat(type, value) {
    const token = this.peek();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      const error = new Error(`PRINT_TEMPLATE_PARSE:${type}:${value || ''}`);
      error.code = 'PRINT_TEMPLATE_PARSE';
      throw error;
    }
    this.index += 1;
    return token;
  }

  parseTernary() {
    const yes = this.parseOr();
    if (this.peek()?.type === 'word' && this.peek().value === 'if') {
      this.index += 1;
      const cond = this.parseOr();
      if (!(this.peek()?.type === 'word' && this.peek().value === 'else')) {
        const error = new Error('PRINT_TEMPLATE_PARSE:else');
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      this.index += 1;
      return { type: 'ternary', cond, yes, no: this.parseTernary() };
    }
    return yes;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek()?.type === 'word' && this.peek().value === 'or') {
      this.index += 1;
      left = { type: 'binary', op: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.peek()?.type === 'word' && this.peek().value === 'and') {
      this.index += 1;
      left = { type: 'binary', op: 'and', left, right: this.parseNot() };
    }
    return left;
  }

  parseNot() {
    if (this.peek()?.type === 'word' && this.peek().value === 'not') {
      this.index += 1;
      return { type: 'unary', op: 'not', arg: this.parseNot() };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseConcat();
    const op = this.peek();
    if (op?.type === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(op.value)) {
      this.index += 1;
      return { type: 'binary', op: op.value, left, right: this.parseConcat() };
    }
    return left;
  }

  parseConcat() {
    let left = this.parseSum();
    while (this.peek()?.type === 'op' && this.peek().value === '~') {
      this.index += 1;
      left = { type: 'binary', op: '~', left, right: this.parseSum() };
    }
    return left;
  }

  parseSum() {
    let left = this.parseFilter();
    while (this.peek()?.type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.peek().value;
      this.index += 1;
      left = { type: 'binary', op, left, right: this.parseFilter() };
    }
    return left;
  }

  parseFilter() {
    let left = this.parsePrimary();
    while (this.peek()?.type === 'op' && this.peek().value === '|') {
      this.index += 1;
      const name = this.eat('word').value;
      let args = [];
      if (this.peek()?.type === 'op' && this.peek().value === '(') {
        const parsed = this.parseArguments();
        args = parsed.args;
      }
      left = { type: 'filter', value: left, name, args };
    }
    return left;
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) {
      const error = new Error('PRINT_TEMPLATE_PARSE:end');
      error.code = 'PRINT_TEMPLATE_PARSE';
      throw error;
    }
    if (token.type === 'string' || token.type === 'number') {
      this.index += 1;
      return { type: 'lit', value: token.value };
    }
    if (token.type === 'word') {
      if (token.value === 'true' || token.value === 'True') {
        this.index += 1;
        return { type: 'lit', value: true };
      }
      if (token.value === 'false' || token.value === 'False') {
        this.index += 1;
        return { type: 'lit', value: false };
      }
      if (token.value === 'none' || token.value === 'None' || token.value === 'null') {
        this.index += 1;
        return { type: 'lit', value: null };
      }
      this.index += 1;
      return this.parseSuffix({ type: 'name', name: token.value });
    }
    if (token.type === 'op' && token.value === '(') {
      this.index += 1;
      const expr = this.parseTernary();
      this.eat('op', ')');
      return this.parseSuffix(expr);
    }
    if (token.type === 'op' && token.value === '[') {
      this.index += 1;
      const items = [];
      if (!(this.peek()?.type === 'op' && this.peek().value === ']')) {
        items.push(this.parseTernary());
        while (this.peek()?.type === 'op' && this.peek().value === ',') {
          this.index += 1;
          items.push(this.parseTernary());
        }
      }
      this.eat('op', ']');
      return this.parseSuffix({ type: 'list', items });
    }
    const error = new Error(`PRINT_TEMPLATE_PARSE:${token.value}`);
    error.code = 'PRINT_TEMPLATE_PARSE';
    throw error;
  }

  parseSuffix(base) {
    let expr = base;
    while (this.peek()?.type === 'op' && (this.peek().value === '.' || this.peek().value === '(')) {
      if (this.peek().value === '.') {
        this.index += 1;
        expr = { type: 'attr', object: expr, name: this.eat('word').value };
        continue;
      }
      const parsed = this.parseArguments();
      expr = { type: 'call', callee: expr, args: parsed.args, kwargs: parsed.kwargs };
    }
    return expr;
  }

  parseArguments() {
    this.eat('op', '(');
    const args = [];
    const kwargs = [];
    if (!(this.peek()?.type === 'op' && this.peek().value === ')')) {
      while (true) {
        if (this.peek()?.type === 'word' && this.tokens[this.index + 1]?.type === 'op' && this.tokens[this.index + 1]?.value === '=') {
          const name = this.eat('word').value;
          this.eat('op', '=');
          kwargs.push({ name, value: this.parseTernary() });
        } else {
          args.push(this.parseTernary());
        }
        if (this.peek()?.type === 'op' && this.peek().value === ',') {
          this.index += 1;
          continue;
        }
        break;
      }
    }
    this.eat('op', ')');
    return { args, kwargs };
  }
}

export function parsePrintExpression(source) {
  const parser = new ExprParser(lex(source));
  const ast = parser.parseTernary();
  if (parser.peek()) {
    const error = new Error(`PRINT_TEMPLATE_PARSE:trailing:${source}`);
    error.code = 'PRINT_TEMPLATE_PARSE';
    throw error;
  }
  return ast;
}

function evalExpr(ast, scope) {
  switch (ast.type) {
    case 'lit':
      return ast.value;
    case 'name':
      return lookup(scope, ast.name);
    case 'list':
      return ast.items.map((item) => evalExpr(item, scope));
    case 'attr': {
      const object = evalExpr(ast.object, scope);
      return getattr(object, ast.name);
    }
    case 'call': {
      const ownerAst = ast.callee.type === 'attr' ? ast.callee.object : null;
      const owner = ownerAst ? evalExpr(ownerAst, scope) : UNDEFINED;
      const fn = evalExpr(ast.callee, scope);
      if (typeof fn !== 'function') {
        const error = new Error('PRINT_TEMPLATE_NOT_CALLABLE');
        error.code = 'PRINT_TEMPLATE_NOT_CALLABLE';
        throw error;
      }
      const args = ast.args.map((arg) => evalExpr(arg, scope));
      const kwargs = {};
      for (const entry of ast.kwargs) kwargs[entry.name] = evalExpr(entry.value, scope);
      if (Object.keys(kwargs).length > 0) args.push(kwargs);
      return fn.apply(owner === UNDEFINED ? undefined : owner, args);
    }
    case 'filter': {
      const value = evalExpr(ast.value, scope);
      const args = ast.args.map((arg) => evalExpr(arg, scope));
      return applyFilter(value, ast.name, args);
    }
    case 'unary':
      return !isTruthy(evalExpr(ast.arg, scope));
    case 'binary': {
      if (ast.op === 'or') {
        const left = evalExpr(ast.left, scope);
        return isTruthy(left) ? left : evalExpr(ast.right, scope);
      }
      if (ast.op === 'and') {
        const left = evalExpr(ast.left, scope);
        return isTruthy(left) ? evalExpr(ast.right, scope) : left;
      }
      const left = evalExpr(ast.left, scope);
      const right = evalExpr(ast.right, scope);
      if (ast.op === '==') return jinjaEqual(left, right);
      if (ast.op === '!=') return !jinjaEqual(left, right);
      if (ast.op === '<') return Number(left) < Number(right);
      if (ast.op === '>') return Number(left) > Number(right);
      if (ast.op === '<=') return Number(left) <= Number(right);
      if (ast.op === '>=') return Number(left) >= Number(right);
      if (ast.op === '~') return `${asText(left)}${asText(right)}`;
      if (ast.op === '+') return Number(left) + Number(right);
      if (ast.op === '-') return Number(left) - Number(right);
      break;
    }
    case 'ternary':
      return isTruthy(evalExpr(ast.cond, scope)) ? evalExpr(ast.yes, scope) : evalExpr(ast.no, scope);
    default:
      break;
  }
  const error = new Error(`PRINT_TEMPLATE_EVAL:${ast.type}`);
  error.code = 'PRINT_TEMPLATE_EVAL';
  throw error;
}

function splitTemplate(source) {
  const parts = [];
  const pattern = /\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|\{#[\s\S]*?#\}/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > last) parts.push({ kind: 'text', value: source.slice(last, match.index) });
    const raw = match[0];
    if (raw.startsWith('{{')) parts.push({ kind: 'var', expr: raw.slice(2, -2).trim() });
    else if (raw.startsWith('{%' )) parts.push({ kind: 'tag', text: raw.slice(2, -2).trim() });
    last = match.index + raw.length;
  }
  if (last < source.length) parts.push({ kind: 'text', value: source.slice(last) });
  return parts;
}

function parseBlocks(parts) {
  const root = { type: 'block', body: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const writeTarget = () => {
    const node = top();
    if (node.type === 'if') {
      if (node.elseBody) return node.elseBody;
      if (node.elifs.length > 0) return node.elifs[node.elifs.length - 1].body;
      return node.body;
    }
    return node.body;
  };

  for (const part of parts) {
    if (part.kind === 'text') {
      writeTarget().push({ type: 'text', value: part.value });
      continue;
    }
    if (part.kind === 'var') {
      writeTarget().push({ type: 'var', expr: parsePrintExpression(part.expr) });
      continue;
    }
    const tag = part.text.trim();
    if (tag.startsWith('if ')) {
      const node = { type: 'if', test: parsePrintExpression(tag.slice(3).trim()), body: [], elifs: [], elseBody: null };
      writeTarget().push(node);
      stack.push(node);
    } else if (tag.startsWith('elif ')) {
      const node = top();
      if (node.type !== 'if' || node.elseBody) {
        const error = new Error('PRINT_TEMPLATE_PARSE:elif');
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      node.elifs.push({ test: parsePrintExpression(tag.slice(5).trim()), body: [] });
    } else if (tag === 'else') {
      const node = top();
      if (node.type !== 'if' || node.elseBody) {
        const error = new Error('PRINT_TEMPLATE_PARSE:else');
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      node.elseBody = [];
    } else if (tag === 'endif') {
      if (top().type !== 'if') {
        const error = new Error('PRINT_TEMPLATE_PARSE:endif');
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      stack.pop();
    } else if (tag.startsWith('for ')) {
      const matched = tag.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([\s\S]+)$/);
      if (!matched) {
        const error = new Error(`PRINT_TEMPLATE_PARSE:for:${tag}`);
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      const node = { type: 'for', varName: matched[1], iter: parsePrintExpression(matched[2].trim()), body: [] };
      writeTarget().push(node);
      stack.push(node);
    } else if (tag === 'endfor') {
      if (top().type !== 'for') {
        const error = new Error('PRINT_TEMPLATE_PARSE:endfor');
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      stack.pop();
    } else if (tag.startsWith('set ')) {
      const body = tag.slice(4).trim();
      const eq = body.indexOf('=');
      if (eq <= 0) {
        const error = new Error(`PRINT_TEMPLATE_PARSE:set:${tag}`);
        error.code = 'PRINT_TEMPLATE_PARSE';
        throw error;
      }
      writeTarget().push({
        type: 'set',
        target: body.slice(0, eq).trim(),
        expr: parsePrintExpression(body.slice(eq + 1).trim()),
      });
    } else {
      const error = new Error(`PRINT_TEMPLATE_PARSE:tag:${tag}`);
      error.code = 'PRINT_TEMPLATE_PARSE';
      throw error;
    }
  }
  if (stack.length !== 1) {
    const error = new Error('PRINT_TEMPLATE_PARSE:unclosed');
    error.code = 'PRINT_TEMPLATE_PARSE';
    throw error;
  }
  return root.body;
}

function renderNodes(nodes, scope) {
  let html = '';
  for (const node of nodes) {
    if (node.type === 'text') html += node.value;
    else if (node.type === 'var') html += outputText(evalExpr(node.expr, scope));
    else if (node.type === 'set') assign(node, scope);
    else if (node.type === 'if') html += renderIf(node, scope);
    else if (node.type === 'for') html += renderFor(node, scope);
  }
  return html;
}

function assign(node, scope) {
  const value = evalExpr(node.expr, scope);
  const dot = node.target.indexOf('.');
  if (dot === -1) {
    scope.vars[node.target] = value;
    return;
  }
  const object = lookup(scope, node.target.slice(0, dot));
  if (object == null || object === UNDEFINED) {
    const error = new Error(`PRINT_TEMPLATE_ASSIGN:${node.target}`);
    error.code = 'PRINT_TEMPLATE_ASSIGN';
    throw error;
  }
  object[node.target.slice(dot + 1)] = value;
}

function renderIf(node, scope) {
  let body = null;
  if (isTruthy(evalExpr(node.test, scope))) body = node.body;
  else {
    for (const branch of node.elifs) {
      if (isTruthy(evalExpr(branch.test, scope))) {
        body = branch.body;
        break;
      }
    }
    if (!body && node.elseBody) body = node.elseBody;
  }
  if (!body) return '';
  // Jinja {% set %} inside {% if %} is visible after the if. Loop scopes stay separate.
  return renderNodes(body, scope);
}

function renderFor(node, scope) {
  const list = evalExpr(node.iter, scope);
  if (!Array.isArray(list)) {
    const error = new Error(`PRINT_TEMPLATE_FOR:${node.varName}`);
    error.code = 'PRINT_TEMPLATE_FOR';
    throw error;
  }
  let html = '';
  list.forEach((item, index) => {
    const child = childScope(scope);
    child.vars[node.varName] = item;
    child.vars.loop = {
      index: index + 1,
      index0: index,
      first: index === 0,
      last: index === list.length - 1,
      length: list.length,
    };
    html += renderNodes(node.body, child);
  });
  return html;
}

export function renderPrintTemplate(source, context) {
  const nodes = parseBlocks(splitTemplate(source));
  const scope = childScope(null);
  for (const [key, value] of Object.entries(context || {})) scope.vars[key] = value;
  if (!Object.prototype.hasOwnProperty.call(scope.vars, 'namespace')) scope.vars.namespace = namespace;
  if (!Object.prototype.hasOwnProperty.call(scope.vars, 'range')) {
    scope.vars.range = (count) => Array.from({ length: Number(count) }, (_, index) => index);
  }
  return renderNodes(nodes, scope);
}

function formatAmount(amount, currency) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '';
  const [whole, fraction] = number.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${grouped}.${fraction}`;
}

function formatQty(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function decorateDoc(doc) {
  const currency = String(doc?.currency || '');
  const items = (Array.isArray(doc?.items) ? doc.items : []).map((item) => ({
    ...item,
    get_formatted(field) {
      if (field === 'qty') return formatQty(item.qty);
      return formatAmount(item[field], currency);
    },
  }));
  const taxes = (Array.isArray(doc?.taxes) ? doc.taxes : []).map((tax) => ({
    ...tax,
    get_formatted(field) {
      return formatAmount(tax[field], currency);
    },
  }));
  return {
    ...doc,
    items,
    taxes,
    get_formatted(field) {
      return formatAmount(this[field], this.currency || currency);
    },
  };
}

function buildFrappe(parentOf, addresses) {
  return {
    db: {
      get_value(doctype, name, field, kwargs = null) {
        if (doctype === 'Item Group' && field === 'parent_item_group') {
          const parent = parentOf(name);
          return parent || '';
        }
        if (doctype === 'Address' && kwargs && kwargs.as_dict === true) {
          return addresses[name] || {};
        }
        return '';
      },
    },
    utils: {
      format_date(value) {
        if (value == null || value === '') return '';
        const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : String(value);
      },
    },
  };
}

export function loadSalesOrderPrintTemplate(repoRoot = REPO_ROOT) {
  return readFileSync(path.join(repoRoot, SALES_ORDER_PRINT_TEMPLATE), 'utf8');
}

/**
 * Render the canonical Sales Order print format. `parentOf` must walk Item
 * Group ancestry the same way ERPNext `parent_item_group` does.
 */
export function renderProfessionalSalesOrder(doc, options = {}) {
  const template = options.templateSource || loadSalesOrderPrintTemplate(options.repoRoot);
  const parentOf = options.parentOf || (() => null);
  const html = renderPrintTemplate(template, {
    doc: decorateDoc(doc),
    frappe: buildFrappe(parentOf, options.addresses || {}),
  });
  return {
    html,
    pdf: null,
    pdf_gate: NATIVE_SALES_ORDER_PDF_GATE,
    print_format: NATIVE_SALES_ORDER_PDF_GATE.print_format,
  };
}
