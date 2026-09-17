import { createClient } from '@vercel/kv';

// @vercel/kv's default client explicitly overrides Upstash's `no-store`
// default to `cache: "default"` (recommended for most Next.js data-fetching
// use cases). For us this backfired badly: Vercel's Data Cache ended up
// serving an indefinitely stale snapshot of `sessions:index` (missing tokens
// added after the cache was first populated), which broke the client portal.
// We always want live reads, so force `no-store` here.
export const kv = createClient({
  url: process.env.KV_REST_API_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? '',
  cache: 'no-store',
});
