/**
 * Promptfoo javascript assertion shim.
 * promptfoo loads this file and evaluates the exported function / expression.
 *
 * Config usage:
 *   assert:
 *     - type: javascript
 *       value: file://assertions/mandatory-safety.js
 */

const { promptfooMandatorySafety } = require('./safety.cjs');

module.exports = function mandatorySafety(output, context) {
  return promptfooMandatorySafety(output, context);
};
