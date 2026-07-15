/**
 * LuxeMaurice Training Pack v1 — presence, copy guards, review edition, delivery prep.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PACK = path.join(process.cwd(), 'artifacts', 'luxe-maurice-training-pack-v1');
const ROOT = process.cwd();

const REQUIRED_FILES = [
  'README.md',
  '01-client-review-guide/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  '02-advisor-workflow-guide/ADVISOR