/**
 * Chat Widget v0 — browser bundle.
 *
 * Exports the JS string that the loader.js handler serves to embedding pages.
 * Vanilla, no React, no jQuery. Mounts a floating bubble + expandable panel.
 * Talks to /api/chat-widget/start, /step, /submit on the host that served it.
 *
 * The string is a self-contained IIFE. Substitution tokens are NOT evaluated
 * server-side at this stage; per-tenant config is fetched from /start.
 */

const NO_OP_STUB = `/* CorpFlow chat widget v0 — disabled */
(function(){
  try {
    if (window && window.console && typeof window.console.info === 'function') {
      window.console.info('[corpflow-chat] widget disabled for this tenant');
    }
  } catch (e) { /* ignore */ }
})();
`;

const ACTIVE_BUNDLE = String.raw`/* CorpFlow chat widget v0 — active */
(function(){
  if (window.__corpflowChatWidgetMounted) return;
  window.__corpflowChatWidgetMounted = true;

  function findScript(){
    var cur = document.currentScript;
    if (cur && cur.src) return cur;
    var nodes = document.getElementsByTagName('script');
    for (var i = nodes.length - 1; i >= 0; i--) {
      var s = nodes[i];
      if (s && s.src && s.src.indexOf('/api/chat-widget/loader.js') !== -1) return s;
    }
    return null;
  }

  function originFromScriptSrc(src){
    try {
      var u = new URL(src, window.location.href);
      return u.protocol + '//' + u.host;
    } catch (e) {
      return '';
    }
  }

  function dataAttr(s, name, fallback){
    if (!s || !s.getAttribute) return fallback;
    var v = s.getAttribute('data-' + name);
    return (v == null || v === '') ? fallback : String(v);
  }

  function el(tag, attrs, kids){
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === 'style' && attrs[k] && typeof attrs[k] === 'object') {
          for (var sk in attrs[k]) n.style[sk] = attrs[k][sk];
        } else if (k === 'text') {
          n.textContent = String(attrs[k] == null ? '' : attrs[k]);
        } else {
          n.setAttribute(k, String(attrs[k]));
        }
      }
    }
    if (kids) {
      for (var i = 0; i < kids.length; i++) if (kids[i]) n.appendChild(kids[i]);
    }
    return n;
  }

  var script = findScript();
  if (!script) { return; }
  var apiOrigin = originFromScriptSrc(script.src);
  if (!apiOrigin) return;
  var flowSlug = dataAttr(script, 'flow', 'default');
  var position = dataAttr(script, 'position', 'bottom-right');

  var state = {
    threadId: null,
    currentNode: null,
    config: null,
    history: [],
    submitting: false
  };

  function fetchJson(path, body){
    return fetch(apiOrigin + path, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}'
    }).then(function(r){
      var ok = r.ok;
      return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: ok, status: r.status, data: j }; });
    });
  }

  function escText(s){ return String(s == null ? '' : s); }

  function makeStyles(accent){
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-corpflow-chat', '1');
    var ac = accent && /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : '#1E3A8A';
    styleEl.appendChild(document.createTextNode([
      '.cfcw-root, .cfcw-root * { box-sizing: border-box; }',
      '.cfcw-bubble { position: fixed; ' + (position === 'bottom-left' ? 'left' : 'right') + ': 20px; bottom: 20px; z-index: 2147483600; width: 56px; height: 56px; border-radius: 28px; background: ' + ac + '; color: #fff; display: flex; align-items: center; justify-content: center; font: 600 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.18); border: none; }',
      '.cfcw-panel { position: fixed; ' + (position === 'bottom-left' ? 'left' : 'right') + ': 20px; bottom: 88px; z-index: 2147483601; width: 360px; max-width: calc(100vw - 40px); max-height: 70vh; background: #fff; color: #111; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.22); display: flex; flex-direction: column; overflow: hidden; font: 14px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }',
      '.cfcw-head { padding: 14px 16px; background: ' + ac + '; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }',
      '.cfcw-title { font-weight: 600; font-size: 15px; }',
      '.cfcw-close { background: transparent; color: #fff; border: 0; font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px; }',
      '.cfcw-body { padding: 12px 14px; overflow-y: auto; flex: 1; }',
      '.cfcw-msg { margin: 0 0 10px; padding: 9px 12px; border-radius: 12px; max-width: 92%; word-wrap: break-word; }',
      '.cfcw-msg.bot { background: #F3F4F6; color: #111; align-self: flex-start; }',
      '.cfcw-msg.user { background: ' + ac + '; color: #fff; align-self: flex-end; margin-left: auto; }',
      '.cfcw-actions { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 14px; }',
      '.cfcw-btn { background: #fff; color: ' + ac + '; border: 1.5px solid ' + ac + '; border-radius: 10px; padding: 10px 12px; font: inherit; cursor: pointer; text-align: left; }',
      '.cfcw-btn:hover { background: ' + ac + '; color: #fff; }',
      '.cfcw-input { display: flex; gap: 8px; padding: 0 14px 14px; }',
      '.cfcw-input input, .cfcw-input textarea { flex: 1; border: 1px solid #D1D5DB; border-radius: 10px; padding: 10px 12px; font: inherit; resize: none; }',
      '.cfcw-input button { background: ' + ac + '; color: #fff; border: 0; border-radius: 10px; padding: 0 14px; font: inherit; cursor: pointer; }',
      '.cfcw-foot { padding: 8px 14px; font-size: 11px; color: #6B7280; border-top: 1px solid #E5E7EB; }',
      '.cfcw-error { color: #B91C1C; font-size: 12px; padding: 0 14px 8px; }'
    ].join('\n')));
    return styleEl;
  }

  function setHeadTitle(){
    if (!state.config || !ui || !ui.head) return;
    ui.head.querySelector('.cfcw-title').textContent = state.config.brandName || 'Chat';
  }

  function clearMessages(){ ui.body.innerHTML = ''; }
  function pushMessage(direction, text){
    var div = document.createElement('div');
    div.className = 'cfcw-msg ' + (direction === 'user' ? 'user' : 'bot');
    div.textContent = escText(text);
    ui.body.appendChild(div);
    ui.body.scrollTop = ui.body.scrollHeight;
  }
  function setActions(children){
    ui.actions.innerHTML = '';
    if (children && children.length) for (var i = 0; i < children.length; i++) ui.actions.appendChild(children[i]);
  }
  function setInput(node){
    ui.input.innerHTML = '';
    if (!node) return;
    ui.input.appendChild(node);
  }
  function setError(msg){ ui.error.textContent = msg ? String(msg) : ''; }

  function renderNode(node){
    if (!node) return;
    state.currentNode = node;
    pushMessage('bot', node.prompt);
    setActions(null);
    setInput(null);
    setError('');

    if (node.type === 'menu' || (node.type === 'info' && Array.isArray(node.options) && node.options.length)) {
      var btns = (node.options || []).map(function(opt){
        var b = document.createElement('button');
        b.className = 'cfcw-btn';
        b.textContent = opt.label;
        b.addEventListener('click', function(){ chooseOption(opt); });
        return b;
      });
      setActions(btns);
      return;
    }
    if (node.type === 'info') {
      if (node.next) {
        var b = document.createElement('button');
        b.className = 'cfcw-btn';
        b.textContent = 'Continue';
        b.addEventListener('click', function(){ stepTo(node.next); });
        setActions([b]);
      }
      return;
    }
    if (node.type === 'collect_field') {
      var input;
      if (node.field === 'message') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.type = node.field === 'email' ? 'email' : node.field === 'phone' ? 'tel' : 'text';
      }
      input.placeholder = node.input_label || (
        node.field === 'name' || node.field === 'first_name' ? 'Your first name' :
        node.field === 'surname' ? 'Your surname' :
        node.field === 'email' ? 'you@example.com' :
        node.field === 'phone' ? '+230 ...' :
        node.field === 'message' ? 'Type your message' : ''
      );
      var btn = document.createElement('button');
      btn.textContent = 'Send';
      var wrap = document.createElement('div');
      wrap.className = 'cfcw-input';
      wrap.appendChild(input);
      wrap.appendChild(btn);
      setInput(wrap);
      setTimeout(function(){ try { input.focus(); } catch(e){} }, 30);
      function go(){
        var v = (input.value || '').trim();
        if (!v && node.required !== false) { setError('Please enter a value.'); return; }
        if (state.submitting) return;
        state.submitting = true;
        fetchJson('/api/chat-widget/step', {
          thread_id: state.threadId,
          current_node: node.id,
          input: v,
        }).then(function(res){
          state.submitting = false;
          if (!res.ok) {
            if (res.status === 429) setError('Too many requests. Please wait a moment.');
            else if (res.status === 403) setError('This chat is not available right now.');
            else setError((res.data && res.data.error) || 'Sorry, something went wrong.');
            return;
          }
          pushMessage('user', v);
          if (res.data && res.data.next) renderNode(res.data.next);
          handleStepResult(res.data);
        }).catch(function(){
          state.submitting = false;
          setError('Network error. Please try again.');
        });
      }
      btn.addEventListener('click', go);
      input.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); }
      });
      return;
    }
    if (node.type === 'submit') {
      // Server already finalised on the prior step; just let renderNode show the prompt.
      return;
    }
  }

  function chooseOption(opt){
    if (opt && opt.widget_action === 'restart') {
      pushMessage('user', opt.label);
      restartConversation();
      return;
    }
    if (opt && opt.widget_action === 'close') {
      pushMessage('user', opt.label);
      closePanel();
      return;
    }
    if (state.submitting) return;
    state.submitting = true;
    fetchJson('/api/chat-widget/step', {
      thread_id: state.threadId,
      current_node: state.currentNode ? state.currentNode.id : null,
      choice: opt.next,
    }).then(function(res){
      state.submitting = false;
      if (!res.ok) {
        if (res.status === 429) setError('Too many requests. Please wait a moment.');
        else if (res.status === 403) setError('This chat is not available right now.');
        else setError((res.data && res.data.error) || 'Sorry, something went wrong.');
        return;
      }
      if (res.data && res.data.widget_action === 'ai_ask') {
        pushMessage('user', opt.label);
        showAiAskPanel();
        return;
      }
      pushMessage('user', opt.label);
      if (res.data && res.data.next) renderNode(res.data.next);
      handleStepResult(res.data);
    }).catch(function(){
      state.submitting = false;
      setError('Network error. Please try again.');
    });
  }

  function handleStepResult(data){
    if (!data) return;
    if (data.widget_action === 'restart') { restartConversation(); return; }
    if (data.widget_action === 'close') { closePanel(); return; }
    if (data.widget_action === 'ai_ask') { showAiAskPanel(); return; }
    if (data.completed && !data.next) {
      setActions(null);
      setInput(null);
    }
  }

  function showAiAskPanel(){
    setActions(null);
    setError('');
    pushMessage('bot', 'Ask a question about Living Word. I answer only from approved church records — not guesses.');
    var input = document.createElement('textarea');
    input.rows = 3;
    input.placeholder = 'Type your question…';
    var btn = document.createElement('button');
    btn.textContent = 'Ask';
    var wrap = document.createElement('div');
    wrap.className = 'cfcw-input';
    wrap.appendChild(input);
    wrap.appendChild(btn);
    setInput(wrap);
    setTimeout(function(){ try { input.focus(); } catch(e){} }, 30);

    function afterAnswer(){
      var back = document.createElement('button');
      back.className = 'cfcw-btn';
      back.textContent = 'Back to main menu';
      back.addEventListener('click', function(){ restartConversation(); });
      var again = document.createElement('button');
      again.className = 'cfcw-btn';
      again.textContent = 'Ask another question';
      again.addEventListener('click', function(){ showAiAskPanel(); });
      setActions([again, back]);
      setInput(null);
    }

    function submitAsk(){
      var v = (input.value || '').trim();
      if (!v) { setError('Please type a question.'); return; }
      if (state.submitting || !state.threadId) return;
      state.submitting = true;
      setInput(null);
      setError('');
      pushMessage('user', v);
      pushMessage('bot', 'Looking through approved church information\u2026');
      fetchJson('/api/chat-widget/ask', {
        thread_id: state.threadId,
        question: v,
      }).then(function(res){
        state.submitting = false;
        if (!res.ok) {
          if (res.status === 429) setError('Too many requests. Please wait a moment.');
          else setError((res.data && res.data.error) || 'Sorry, something went wrong.');
          return;
        }
        pushMessage('bot', (res.data && res.data.answer) || 'No answer available.');
        afterAnswer();
      }).catch(function(){
        state.submitting = false;
        setError('Network error. Please try again.');
      });
    }
    btn.addEventListener('click', submitAsk);
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAsk(); }
    });
  }

  function restartConversation(){
    state.threadId = null;
    state.currentNode = null;
    state.submitting = false;
    clearMessages();
    setActions(null);
    setInput(null);
    setError('');
    startConversation();
  }

  function stepTo(nextId){
    if (state.submitting) return;
    state.submitting = true;
    fetchJson('/api/chat-widget/step', {
      thread_id: state.threadId,
      current_node: state.currentNode ? state.currentNode.id : null,
      next: nextId,
    }).then(function(res){
      state.submitting = false;
      if (!res.ok) { setError((res.data && res.data.error) || 'Sorry, something went wrong.'); return; }
      if (res.data && res.data.next) renderNode(res.data.next);
      handleStepResult(res.data);
    }).catch(function(){
      state.submitting = false;
      setError('Network error. Please try again.');
    });
  }

  var ui = {
    root: null,
    bubble: null,
    panel: null,
    head: null,
    body: null,
    actions: null,
    input: null,
    foot: null,
    error: null
  };

  function buildUi(){
    var root = el('div', { 'class': 'cfcw-root' });
    document.head.appendChild(makeStyles(state.config && state.config.brandAccent));
    var bubble = el('button', { 'class': 'cfcw-bubble', 'aria-label': 'Open chat', text: '\u2709' });
    var panel = el('div', { 'class': 'cfcw-panel', style: { display: 'none' } });
    var head = el('div', { 'class': 'cfcw-head' });
    var title = el('div', { 'class': 'cfcw-title', text: (state.config && state.config.brandName) || 'Chat' });
    var close = el('button', { 'class': 'cfcw-close', 'aria-label': 'Close', text: '\u00d7' });
    head.appendChild(title); head.appendChild(close);
    var body = el('div', { 'class': 'cfcw-body' });
    var actions = el('div', { 'class': 'cfcw-actions' });
    var error = el('div', { 'class': 'cfcw-error' });
    var input = el('div', { 'class': 'cfcw-input' });
    var foot = el('div', { 'class': 'cfcw-foot', text: 'Powered by CorpFlow.' });
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(actions);
    panel.appendChild(error);
    panel.appendChild(input);
    panel.appendChild(foot);
    root.appendChild(panel);
    root.appendChild(bubble);
    document.body.appendChild(root);
    bubble.addEventListener('click', openPanel);
    close.addEventListener('click', closePanel);
    ui.root = root; ui.bubble = bubble; ui.panel = panel;
    ui.head = head; ui.body = body; ui.actions = actions;
    ui.input = input; ui.foot = foot; ui.error = error;
  }

  function openPanel(){
    if (!ui.panel) return;
    ui.panel.style.display = 'flex';
    ui.bubble.style.display = 'none';
    if (!state.threadId) startConversation();
  }
  function closePanel(){
    if (!ui.panel) return;
    ui.panel.style.display = 'none';
    ui.bubble.style.display = 'flex';
  }

  function startConversation(){
    setError('');
    fetchJson('/api/chat-widget/start', {
      flow: flowSlug,
      source_host: window.location.host,
      source_path: window.location.pathname
    }).then(function(res){
      if (!res.ok || !res.data || !res.data.ok) {
        setError((res.data && res.data.error) || 'Chat is not available right now.');
        return;
      }
      state.threadId = res.data.thread_id;
      if (res.data.config) {
        state.config = res.data.config;
        setHeadTitle();
      }
      if (res.data.node) renderNode(res.data.node);
    }).catch(function(){
      setError('Network error. Please try again.');
    });
  }

  // Boot: build the UI on DOM ready.
  function boot(){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildUi);
    } else {
      buildUi();
    }
  }
  boot();
})();
`;

/**
 * @param {{ enabled: boolean }} ctx
 * @returns {string}
 */
export function getWidgetBundle(ctx) {
  if (!ctx || ctx.enabled !== true) return NO_OP_STUB;
  return ACTIVE_BUNDLE;
}
