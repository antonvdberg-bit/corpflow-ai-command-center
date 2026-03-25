import { buildClarificationQuestions } from './lib/ai-interview.js';

/**
 * POST /api/cmp/ai-interview
 * Body: { description: string }
 * Returns: { complexity, questions: [string, string, string] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const result = buildClarificationQuestions(description);
  return res.status(200).json(result);
}
