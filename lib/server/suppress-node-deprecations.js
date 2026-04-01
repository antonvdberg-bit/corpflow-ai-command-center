/**
 * Silence Node deprecation warnings in this serverless isolate.
 * Next.js server code paths still call legacy `url.parse()` (DEP0169); the gateway uses WHATWG `URL`
 * in `normalizeRoutingPath` — this only hides upstream noise in Vercel logs until Next migrates.
 */
process.noDeprecation = true;
