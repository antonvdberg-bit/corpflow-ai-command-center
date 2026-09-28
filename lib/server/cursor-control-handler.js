import { PrismaClient } from '@prisma/client';

import {
  getCursorCloudAgentRun,
  getCursorCloudAgentUsage,
  streamCursorCloudAgentRun,
} from './cursor-cloud-agent-client.js';
import { getSessionFromRequest } from './session.js';
import { requireCoreHost } from './host-policy.js';
import {
  buildCursorControlRecord,
  parseCursorControlQuery,
} from './cursor-control-api.js';

const prisma = new PrismaClient();
const API = 'https://api.github.com';

function deny(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

async function requireFactoryMaster(req, res) {
  const host = requireCoreHost(req);
  if (!host.ok) {
    deny(res, host.status || 403, host.code || 'CORE_HOST_REQUIRED');
    return false;
  }
  const session = getSessionFromRequest(req);
  if (!session?.ok || String(session.payload?.typ || '').toLowerCase() !== 'admin') {
    deny(res, 401, 'FACTORY_MASTER_REQUIRED');
    return false;
  }
  const userId = String(session.payload?.user_id || '').trim();
  const user = userId
    ? await prisma.authUser.findUnique({
        where: { id: userId },
        select: { level: true, enabled: true, factoryMaster: true },
      })
    : null;
  if (!user || user.enabled !== true || user.level !== 'admin' || user.factoryMaster !== true) {
    deny(res, 403, 'FACTORY_MASTER_REQUIRED');
    return false;
  }
  return true;
}

async function github(path) {
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || 'antonvdberg-bit/corpflow-ai-command-center').trim();
  if (!token) throw new Error('GITHUB_TOKEN missing');
  const response = await fetch(`${API}/repos/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'corpflow-cursor-control',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return response.json();
}

async function issueRecord(issueNumber) {
  const issue = await github(`/issues/${issueNumber}`);
  const comments = await github(`/issues/${issueNumber}/comments?per_page=100`);
  const record = buildCursorControlRecord({
    issueNumber,
    title: issue.title,
    url: issue.html_url,
    comments,
  });
  return enrichProviderRecord(record);
}

async function enrichProviderRecord(record) {
  const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
  if (!apiKey || !record.cursor_agent_id || !record.cursor_run_id) {
    return { ...record, provider_read: 'unavailable' };
  }
  try {
    const [run, usage] = await Promise.all([
      getCursorCloudAgentRun(apiKey, record.cursor_agent_id, record.cursor_run_id),
      getCursorCloudAgentUsage(apiKey, record.cursor_agent_id, record.cursor_run_id),
    ]);
    const providerStatus = run?.run?.status || run?.status || null;
    return {
      ...record,
      provider_status: providerStatus ? String(providerStatus).slice(0, 80) : null,
      provider_final_result: String(run?.run?.finalResult || run?.finalResult || '').trim().slice(0, 1200) || null,
      usage: summarizeUsage(usage),
      provider_read: 'success',
    };
  } catch {
    return { ...record, provider_read: 'failed' };
  }
}

function summarizeUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const allowed = [
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'cost',
    'costUsd',
    'currency',
  ];
  const out = {};
  for (const key of allowed) {
    if (usage[key] != null && (typeof usage[key] === 'number' || typeof usage[key] === 'string')) {
      out[key] = typeof usage[key] === 'string' ? usage[key].slice(0, 80) : usage[key];
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function handleCursorControl(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 405, 'METHOD_NOT_ALLOWED');
  }
  if (!(await requireFactoryMaster(req, res))) return;
  const parsed = parseCursorControlQuery(req.query || {});
  if (!parsed.ok) return deny(res, parsed.status, parsed.error);
  const { issue, agentId, runId, limit } = parsed.value;
  try {
    if (issue) {
      return res.status(200).json({ ok: true, runs: [await issueRecord(issue)] });
    }
    if (agentId && runId) {
      if (!String(process.env.CURSOR_API_KEY || '').trim()) {
        return deny(res, 503, 'CURSOR_API_KEY_UNAVAILABLE');
      }
      const provider = await getCursorCloudAgentRun(
        String(process.env.CURSOR_API_KEY || ''),
        agentId,
        runId,
      );
      const usage = await getCursorCloudAgentUsage(
        String(process.env.CURSOR_API_KEY || ''),
        agentId,
        runId,
      );
      return res.status(200).json({
        ok: true,
        runs: [
          {
            ...buildCursorControlRecord({
              provider: { ...provider, agentId, id: runId, usage },
              comments: [],
            }),
            provider_read: 'success',
            usage: summarizeUsage(usage),
          },
        ],
      });
    }
    const [claimed, review] = await Promise.all([
      github(`/issues?state=open&labels=dispatch%3Acursor-claimed&per_page=${limit}`),
      github(`/issues?state=open&labels=dispatch%3Aoperator-review&per_page=${limit}`),
    ]);
    const runs = [];
    const rows = [...(Array.isArray(claimed) ? claimed : []), ...(Array.isArray(review) ? review : [])];
    const seen = new Set();
    for (const issueRow of rows) {
      if (issueRow.pull_request) continue;
      if (seen.has(issueRow.number)) continue;
      seen.add(issueRow.number);
      runs.push(await issueRecord(issueRow.number));
    }
    return res.status(200).json({ ok: true, count: runs.length, runs });
  } catch (error) {
    return deny(res, 502, error instanceof Error ? error.message : 'CURSOR_CONTROL_READ_FAILED');
  }
}

export async function handleCursorControlStream(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 405, 'METHOD_NOT_ALLOWED');
  }
  if (!(await requireFactoryMaster(req, res))) return;
  const parsed = parseCursorControlQuery(req.query || {});
  if (!parsed.ok || !parsed.value.agentId || !parsed.value.runId) {
    return deny(res, 400, parsed.ok ? 'AGENT_ID_AND_RUN_ID_REQUIRED' : parsed.error);
  }
  const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
  if (!apiKey) return deny(res, 503, 'CURSOR_API_KEY_UNAVAILABLE');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  try {
    await streamCursorCloudAgentRun(apiKey, parsed.value.agentId, parsed.value.runId, {
      onEvent: (event) => res.write(`data: ${JSON.stringify(event)}\n\n`),
    });
    res.write('event: complete\ndata: {"streamed":true}\n\n');
    return res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'CURSOR_STREAM_FAILED' })}\n\n`);
    return res.end();
  }
}
