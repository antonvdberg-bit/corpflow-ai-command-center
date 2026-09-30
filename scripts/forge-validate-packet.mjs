#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

import { validateForgePacket } from '../lib/forge/task-contracts.js';

const packetPath = process.argv[2];
if (!packetPath) {
  console.error('usage: node scripts/forge-validate-packet.mjs <packet.json>');
  process.exit(2);
}

try {
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const result = validateForgePacket(packet);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    errors: ['packet_read_or_parse_failed'],
    detail: error instanceof Error ? error.message : String(error),
  }));
  process.exit(2);
}
