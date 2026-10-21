import { getPaddleLiveConfig, publicLiveConfigView } from './config.js';

export default async function paddleLiveStatusHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  return res.status(200).json(publicLiveConfigView(getPaddleLiveConfig()));
}
