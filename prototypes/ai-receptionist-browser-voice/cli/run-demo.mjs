#!/usr/bin/env node
/**
 * Local text demo for the synthetic AI receptionist.
 *
 * Usage:
 *   node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs
 *   node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=normal-enquiry
 *   node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --interactive
 *
 * No network. No secrets. Synthetic data only.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { runScriptedConversation, createSession, startSession, handleUserTurn } from '../lib/conversation-engine.mjs';
import { mockTts } from '../lib/mocks/stt-tts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fixturesDir = path.join(root, 'fixtures');

const args = process.argv.slice(2);
const fixtureArg = args.find((a) => a.startsWith('--fixture='));
const interactive = args.includes('--interactive');
const fixtureId = fixtureArg ? fixtureArg.split('=')[1] : 'normal-enquiry';

function printTurn(role, text) {
  const prefix = role === 'assistant' ? 'Assistant' : 'Visitor';
  console.log(`\n[${prefix}]\n${text}`);
  if (role === 'assistant') {
    const tts = mockTts(text);
    console.log(`  (mock-tts utterance_id=${tts.utterance_id})`);
  }
}

async function runInteractive() {
  const session = createSession();
  const opened = startSession(session);
  for (const m of opened.messages) printTurn('assistant', m);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  while (true) {
    const line = await ask('\nYou> ');
    if (line == null) break;
    if (/^(exit|quit)$/i.test(line.trim())) break;
    const result = handleUserTurn(session, line);
    for (const m of result.messages) printTurn('assistant', m);
    if (result.done) {
      console.log('\n--- Draft handoff JSON ---');
      console.log(JSON.stringify(result.handoff, null, 2));
      break;
    }
  }
  rl.close();
}

function runFixture(id) {
  const file = path.join(fixturesDir, `${id}.json`);
  if (!fs.existsSync(file)) {
    console.error(`Fixture not found: ${file}`);
    process.exit(1);
  }
  const fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Running fixture: ${fixture.id} — ${fixture.description}`);
  const result = runScriptedConversation(fixture.user_turns);
  for (const turn of result.transcript) printTurn(turn.role, turn.text);
  console.log('\n--- Draft handoff JSON ---');
  console.log(JSON.stringify(result.handoff, null, 2));
  console.log(`\ndone=${result.done} escalated=${result.escalated}`);
}

if (interactive) {
  await runInteractive();
} else {
  runFixture(fixtureId);
}
