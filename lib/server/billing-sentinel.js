import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const scriptPath = path.join(REPO_ROOT, 'core', 'services', 'billing_sentinel.py');
  const result = spawnSync('python', [scriptPath], {
    encoding: 'utf8',
  });

  if (result.error) {
    return res.status(500).json({ ok: false, error: String(result.error.message || result.error) });
  }
  if (result.status !== 0) {
    return res.status(500).json({
      ok: false,
      error: 'billing_sentinel_failed',
      stderr: String(result.stderr || '').slice(0, 800),
    });
  }

  let payload = {};
  try {
    payload = JSON.parse(String(result.stdout || '{}'));
  } catch (_) {
    payload = { raw: String(result.stdout || '').slice(0, 800) };
  }

  return res.status(200).json({ ok: true, sentinel: payload });
}

